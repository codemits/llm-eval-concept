/**
 * Core types for LLM evaluation framework
 */

export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  // Azure OpenAI specific
  azureEndpoint?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  timestamp: Date;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput?: string;
  category: TestCategory;
  metadata?: Record<string, any>;
}

export type TestCategory = 
  | 'correctness' 
  | 'safety' 
  | 'format' 
  | 'performance' 
  | 'consistency';

export interface EvaluationResult {
  testCaseId: string;
  passed: boolean;
  score?: number;
  details: string;
  response: LLMResponse;
  metrics?: EvaluationMetrics;
}

export interface EvaluationMetrics {
  accuracy?: number;
  hallucinationRate?: number;
  refusalRate?: number;
  formatAdherence?: number;
  consistencyScore?: number;
  averageLatency?: number;
  averageCost?: number;
}

export interface GoldenDatasetEntry {
  id: string;
  prompt: string;
  expectedAnswer: string;
  category: string;
  evaluationCriteria: string[];
}

export interface PropertyCheck {
  name: string;
  check: (response: string) => boolean;
  description: string;
}
