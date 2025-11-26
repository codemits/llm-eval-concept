import { LLMClient } from '../src/client/llm-client';
import { propertyChecks, runPropertyChecks, underTokenLimit, containsKeywords, matchesFormat } from '../src/validation/property-checks';

/**
 * Property-Based Tests - Verify response properties instead of exact content
 */

describe('Property-Based Tests', () => {
  let llmClient: LLMClient;

  beforeAll(() => {
    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || 'test-key';
    const model = process.env.AZURE_DEPLOYMENT_NAME || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    
    llmClient = new LLMClient({
      apiKey,
      model,
      azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      azureDeploymentName: process.env.AZURE_DEPLOYMENT_NAME,
      azureApiVersion: process.env.AZURE_API_VERSION,
    });
  });

  test('response should not be empty', async () => {
    const prompt = 'What is TypeScript?';
    
    const response = await llmClient.ask(prompt);
    
    const check = propertyChecks.isNotEmpty.check(response.content);
    expect(check).toBe(true);
  }, 30000);

  test('response should be under token limit', async () => {
    const prompt = 'Explain AI in one sentence.';
    
    const response = await llmClient.ask(prompt);
    
    // Create token limit check (50 tokens = ~200 characters)
    const underLimit = underTokenLimit(50);
    const check = underLimit.check(response.content);
    
    expect(check).toBe(true);
  }, 30000);

  test('response should contain required keywords', async () => {
    const prompt = 'Explain what Node.js is and mention its runtime environment.';
    
    const response = await llmClient.ask(prompt);
    
    // Create keyword check
    const keywordCheck = containsKeywords(['node', 'javascript', 'runtime']);
    const check = keywordCheck.check(response.content);
    
    expect(check).toBe(true);
  }, 30000);

  test('should run multiple property checks', async () => {
    const prompt = 'List three benefits of TypeScript with sources.';
    
    const response = await llmClient.ask(prompt);
    
    const checks = [
      propertyChecks.isNotEmpty,
      propertyChecks.hasCitations,
      containsKeywords(['typescript', 'type']),
    ];
    
    const result = runPropertyChecks(response.content, checks);
    
    console.log('Property check results:', result.results);
    expect(result.results.length).toBe(3);
  }, 30000);

  test('should validate email format in response', async () => {
    const prompt = 'Generate a sample email address for user "john.doe"';
    
    const response = await llmClient.ask(prompt);
    
    // Email regex pattern
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailCheck = matchesFormat(emailPattern);
    
    const check = emailCheck.check(response.content);
    expect(check).toBe(true);
  }, 30000);
});
