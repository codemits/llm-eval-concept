import { EvaluationMetrics, EvaluationResult } from '../types';

/**
 * Metrics calculator for LLM evaluation results
 */
export class MetricsCalculator {
  /**
   * Calculate BLEU score approximation
   * (Simplified version - for production use a proper BLEU implementation)
   */
  static calculateBLEU(reference: string, candidate: string): number {
    const refWords = reference.toLowerCase().split(/\s+/);
    const candWords = candidate.toLowerCase().split(/\s+/);
    
    const matches = candWords.filter(word => refWords.includes(word)).length;
    const precision = matches / candWords.length;
    
    return precision;
  }

  /**
   * Calculate consistency score across multiple responses
   */
  static calculateConsistency(responses: string[]): number {
    if (responses.length < 2) return 1.0;

    // Calculate pairwise similarity
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        totalSimilarity += this.calculateBLEU(responses[i], responses[j]);
        comparisons++;
      }
    }

    return totalSimilarity / comparisons;
  }

  /**
   * Calculate hallucination rate
   * (Simplified - checks if response contains made-up facts)
   */
  static calculateHallucinationRate(results: EvaluationResult[]): number {
    const correctnessTests = results.filter(r => 
      r.details.includes('correctness') || r.details.includes('Expected:')
    );

    if (correctnessTests.length === 0) return 0;

    const hallucinated = correctnessTests.filter(r => !r.passed).length;
    return hallucinated / correctnessTests.length;
  }

  /**
   * Calculate format adherence rate
   */
  static calculateFormatAdherence(results: EvaluationResult[]): number {
    const formatTests = results.filter(r => 
      r.details.includes('JSON') || r.details.includes('format')
    );

    if (formatTests.length === 0) return 1.0;

    const passed = formatTests.filter(r => r.passed).length;
    return passed / formatTests.length;
  }

  /**
   * Generate comprehensive metrics report
   */
  static generateReport(results: EvaluationResult[]): EvaluationMetrics {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;

    return {
      accuracy: passedTests / totalTests,
      hallucinationRate: this.calculateHallucinationRate(results),
      refusalRate: this.calculateRefusalRate(results),
      formatAdherence: this.calculateFormatAdherence(results),
      averageLatency: this.calculateAverageLatency(results),
      averageCost: this.calculateAverageCost(results),
    };
  }

  /**
   * Calculate refusal rate for safety tests
   */
  private static calculateRefusalRate(results: EvaluationResult[]): number {
    const safetyTests = results.filter(r => 
      r.details.toLowerCase().includes('refuse') || 
      r.details.toLowerCase().includes('safety')
    );

    if (safetyTests.length === 0) return 0;

    const refused = safetyTests.filter(r => r.passed).length;
    return refused / safetyTests.length;
  }

  /**
   * Calculate average latency
   */
  private static calculateAverageLatency(results: EvaluationResult[]): number {
    const total = results.reduce((sum, r) => sum + r.response.latencyMs, 0);
    return total / results.length;
  }

  /**
   * Calculate average cost
   */
  private static calculateAverageCost(results: EvaluationResult[]): number {
    const totalTokens = results.reduce((sum, r) => sum + r.response.tokensUsed, 0);
    // Approximate cost: $0.02 per 1K tokens
    return (totalTokens / 1000) * 0.02;
  }
}
