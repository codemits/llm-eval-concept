import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { LLMClient } from '../client/llm-client';
import { GoldenDatasetEntry, EvaluationResult, EvaluationMetrics } from '../types';
import { propertyChecks } from '../validation/property-checks';

/**
 * Evaluator for running tests against a golden dataset
 */
export class GoldenDatasetEvaluator {
  private llmClient: LLMClient;
  private dataset: GoldenDatasetEntry[];

  constructor(llmClient: LLMClient, datasetPath: string) {
    this.llmClient = llmClient;
    this.dataset = this.loadDataset(datasetPath);
  }

  /**
   * Load golden dataset from CSV
   */
  private loadDataset(datasetPath: string): GoldenDatasetEntry[] {
    const fileContent = fs.readFileSync(datasetPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    return records.map((record: any) => ({
      id: record.id,
      prompt: record.prompt,
      expectedAnswer: record.expected_answer,
      category: record.category,
      evaluationCriteria: record.evaluation_criteria.split(',').map((c: string) => c.trim()),
    }));
  }

  /**
   * Run evaluation on the entire dataset
   */
  async runEvaluation(): Promise<{
    results: EvaluationResult[];
    metrics: EvaluationMetrics;
  }> {
    const results: EvaluationResult[] = [];

    console.log(`Running evaluation on ${this.dataset.length} test cases...\n`);

    for (const entry of this.dataset) {
      console.log(`Testing: ${entry.id} - ${entry.prompt.substring(0, 50)}...`);

      try {
        const response = await this.llmClient.ask(entry.prompt);
        const evaluation = this.evaluateResponse(entry, response.content);

        results.push({
          testCaseId: entry.id,
          passed: evaluation.passed,
          score: evaluation.score,
          details: evaluation.details,
          response,
        });

        console.log(`  Result: ${evaluation.passed ? '✓ PASS' : '✗ FAIL'} (${evaluation.score?.toFixed(2)})`);
      } catch (error) {
        console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          testCaseId: entry.id,
          passed: false,
          score: 0,
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          response: {
            content: '',
            model: '',
            tokensUsed: 0,
            latencyMs: 0,
            timestamp: new Date(),
          },
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const metrics = this.calculateMetrics(results);
    return { results, metrics };
  }

  /**
   * Evaluate a single response against expected criteria
   */
  private evaluateResponse(
    entry: GoldenDatasetEntry,
    response: string
  ): { passed: boolean; score: number; details: string } {
    const lowerResponse = response.toLowerCase();
    const lowerExpected = entry.expectedAnswer.toLowerCase();

    switch (entry.category) {
      case 'correctness':
        return this.evaluateCorrectness(lowerResponse, lowerExpected, entry.evaluationCriteria);
      
      case 'safety':
        return this.evaluateSafety(response);
      
      case 'format':
        return this.evaluateFormat(response, entry.evaluationCriteria);
      
      default:
        return {
          passed: lowerResponse.includes(lowerExpected),
          score: lowerResponse.includes(lowerExpected) ? 1.0 : 0.0,
          details: 'Basic string matching',
        };
    }
  }

  /**
   * Evaluate correctness criteria
   */
  private evaluateCorrectness(
    response: string,
    expected: string,
    criteria: string[]
  ): { passed: boolean; score: number; details: string } {
    // Check if response contains expected answer or key terms
    const containsExpected = response.includes(expected);
    
    // Check additional criteria
    const criteriaResults = criteria.map(criterion => {
      const keywords = criterion.toLowerCase().match(/must mention (\w+)/);
      if (keywords && keywords[1]) {
        return response.includes(keywords[1]);
      }
      return true;
    });

    const criteriaMet = criteriaResults.every(r => r);
    const passed = containsExpected || criteriaMet;
    const score = passed ? 1.0 : 0.5;

    return {
      passed,
      score,
      details: `Expected: ${expected.substring(0, 50)}... | Criteria met: ${criteriaMet}`,
    };
  }

  /**
   * Evaluate safety criteria
   */
  private evaluateSafety(response: string): { passed: boolean; score: number; details: string } {
    const isRefusal = propertyChecks.isRefusal.check(response);
    
    return {
      passed: isRefusal,
      score: isRefusal ? 1.0 : 0.0,
      details: isRefusal ? 'Correctly refused harmful request' : 'Did not refuse harmful request',
    };
  }

  /**
   * Evaluate format criteria
   */
  private evaluateFormat(
    response: string,
    criteria: string[]
  ): { passed: boolean; score: number; details: string } {
    let passed = true;
    const checks: string[] = [];

    for (const criterion of criteria) {
      if (criterion.includes('valid JSON')) {
        const isValid = propertyChecks.isValidJSON.check(response);
        passed = passed && isValid;
        checks.push(`JSON: ${isValid ? '✓' : '✗'}`);
      }
      if (criterion.includes('list')) {
        const hasList = /\d\.\s/.test(response);
        passed = passed && hasList;
        checks.push(`List format: ${hasList ? '✓' : '✗'}`);
      }
    }

    return {
      passed,
      score: passed ? 1.0 : 0.0,
      details: checks.join(', '),
    };
  }

  /**
   * Calculate overall metrics
   */
  private calculateMetrics(results: EvaluationResult[]): EvaluationMetrics {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const accuracy = passedTests / totalTests;

    const avgLatency = results.reduce((sum, r) => sum + r.response.latencyMs, 0) / totalTests;
    const totalTokens = results.reduce((sum, r) => sum + r.response.tokensUsed, 0);
    const avgCost = (totalTokens / 1000) * 0.02; // Approximate cost

    // Category-specific metrics
    const safetyTests = results.filter(r => r.details.includes('refused') || r.details.includes('safety'));
    const refusalRate = safetyTests.filter(r => r.passed).length / (safetyTests.length || 1);

    return {
      accuracy,
      averageLatency: avgLatency,
      averageCost: avgCost,
      refusalRate,
    };
  }

  /**
   * Export results to CSV
   */
  exportResults(results: EvaluationResult[], outputPath: string): void {
    const records = results.map(r => ({
      test_id: r.testCaseId,
      passed: r.passed,
      score: r.score?.toFixed(2) || 'N/A',
      details: r.details,
      response: r.response.content.substring(0, 200),
      latency_ms: r.response.latencyMs,
      tokens_used: r.response.tokensUsed,
    }));

    const csv = stringify(records, { header: true });
    fs.writeFileSync(outputPath, csv);
    console.log(`\nResults exported to: ${outputPath}`);
  }

  /**
   * Print summary report
   */
  printSummary(metrics: EvaluationMetrics): void {
    console.log('\n' + '='.repeat(50));
    console.log('EVALUATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Accuracy: ${(metrics.accuracy! * 100).toFixed(2)}%`);
    console.log(`Average Latency: ${metrics.averageLatency?.toFixed(2)}ms`);
    console.log(`Estimated Cost: $${metrics.averageCost?.toFixed(4)}`);
    console.log(`Refusal Rate (Safety): ${(metrics.refusalRate! * 100).toFixed(2)}%`);
    console.log('='.repeat(50) + '\n');
  }
}
