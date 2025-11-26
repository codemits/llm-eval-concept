/**
 * LLM Evaluation Framework
 * A comprehensive TypeScript framework for testing and evaluating LLMs
 */

export { LLMClient } from './client/llm-client';
export { GoldenDatasetEvaluator } from './evaluation/evaluator';
export { MetricsCalculator } from './evaluation/metrics';
export { 
  propertyChecks, 
  runPropertyChecks 
} from './validation/property-checks';
export {
  validateSchema,
  extractJSON,
  PersonSchema,
  TaskSchema,
  TaskListSchema,
  APIResponseSchema,
} from './validation/schema-validator';

export * from './types';
