import * as path from 'path';
import * as dotenv from 'dotenv';
import { LLMClient } from '../client/llm-client';
import { GoldenDatasetEvaluator } from './evaluator';

// Load environment variables
dotenv.config();

/**
 * Main evaluation script
 * Run this to evaluate your LLM against the golden dataset
 */
async function main() {
  // Check for API key (Azure or OpenAI)
  const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: No API key found in environment variables');
    console.error('Please set AZURE_OPENAI_API_KEY or OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  // Initialize LLM client (Azure or OpenAI)
  const model = process.env.AZURE_DEPLOYMENT_NAME || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  const llmClient = new LLMClient({
    apiKey,
    model,
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureDeploymentName: process.env.AZURE_DEPLOYMENT_NAME,
    azureApiVersion: process.env.AZURE_API_VERSION,
    temperature: 0.3, // Ignored for GPT-5
  });

  console.log(`Using model: ${model}`);
  if (process.env.AZURE_OPENAI_ENDPOINT) {
    console.log(`Azure endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}\n`);
  }

  // Path to golden dataset
  const datasetPath = path.join(__dirname, '../../evaluation/golden_dataset.csv');
  const outputPath = path.join(__dirname, '../../evaluation/results.csv');

  // Create evaluator and run
  const evaluator = new GoldenDatasetEvaluator(llmClient, datasetPath);
  
  console.log('Starting LLM evaluation...\n');
  
  const { results, metrics } = await evaluator.runEvaluation();
  
  // Print summary
  evaluator.printSummary(metrics);
  
  // Export results
  evaluator.exportResults(results, outputPath);
  
  console.log('Evaluation complete!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
  });
}

export { main };
