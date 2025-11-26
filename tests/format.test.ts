import { LLMClient } from '../src/client/llm-client';
import { validateSchema, extractJSON, PersonSchema } from '../src/validation/schema-validator';

/**
 * Format Tests - Verify LLM outputs follow required structure
 */

describe('Format Tests', () => {
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
      temperature: 0.1, // Low temperature for consistent formatting (ignored for GPT-5)
    });
  });

  test('should generate valid JSON with name and age', async () => {
    const prompt = 'Generate a JSON object with a person\'s name and age. Name should be "Alice" and age should be 30.';
    const systemPrompt = 'You are a JSON generator. Only output valid JSON, no other text.';

    const response = await llmClient.ask(prompt, systemPrompt);
    
    // Extract JSON from response (in case it's wrapped in markdown)
    const jsonContent = extractJSON(response.content);
    
    // Parse and validate
    const parsed = JSON.parse(jsonContent);
    expect(parsed).toHaveProperty('name');
    expect(parsed).toHaveProperty('age');
    expect(typeof parsed.name).toBe('string');
    expect(typeof parsed.age).toBe('number');
  }, 30000);

  test('should validate against Zod schema', async () => {
    const prompt = 'Create a JSON with: name (string), age (positive integer), email (optional valid email)';
    const systemPrompt = 'Output only valid JSON, no markdown or extra text.';

    const response = await llmClient.ask(prompt, systemPrompt);
    const jsonContent = extractJSON(response.content);

    const validation = validateSchema(jsonContent, PersonSchema);
    
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.data).toBeDefined();
      expect(validation.data?.name).toBeDefined();
      expect(validation.data?.age).toBeGreaterThan(0);
    }
  }, 30000);

  test('should handle invalid JSON gracefully', () => {
    const invalidJSON = '{ name: "Alice", age: 30 }'; // Missing quotes
    
    const validation = validateSchema(invalidJSON, PersonSchema);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
    expect(validation.errors!.length).toBeGreaterThan(0);
  });

  test('should extract JSON from markdown code blocks', () => {
    const markdownResponse = '```json\n{"name": "Bob", "age": 25}\n```';
    
    const extracted = extractJSON(markdownResponse);
    const parsed = JSON.parse(extracted);
    
    expect(parsed.name).toBe('Bob');
    expect(parsed.age).toBe(25);
  });
});
