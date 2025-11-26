import { LLMClient } from '../src/client/llm-client';

/**
 * Behavior Tests - Verify specific behaviors for given inputs
 */

describe('Behavior Tests', () => {
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
      temperature: 0, // Deterministic responses (ignored for GPT-5)
    });
  });

  test('should extract the correct entity from text', async () => {
    const prompt = 'Extract the person name from this text: "John Smith visited Paris last week." Return only the name.';
    
    const response = await llmClient.ask(prompt);
    
    // Should contain "John Smith"
    expect(response.content).toContain('John Smith');
  }, 30000);

  test('should answer factual questions correctly', async () => {
    const prompt = 'What is the capital of Australia? Answer in one word.';
    
    const response = await llmClient.ask(prompt);
    
    // Should say Canberra (not Sydney!)
    expect(response.content.toLowerCase()).toContain('canberra');
  }, 30000);

  test('should follow instructions for output format', async () => {
    const prompt = 'List three colors. Format: 1. Color, 2. Color, 3. Color';
    
    const response = await llmClient.ask(prompt);
    
    // Should follow numbered list format
    expect(response.content).toMatch(/1\./);
    expect(response.content).toMatch(/2\./);
    expect(response.content).toMatch(/3\./);
  }, 30000);

  test('should perform simple calculations correctly', async () => {
    const prompt = 'What is 127 + 358? Give only the number.';
    
    const response = await llmClient.ask(prompt);
    
    // Should calculate correctly
    expect(response.content).toContain('485');
  }, 30000);

  test('should handle ambiguous questions appropriately', async () => {
    const prompt = 'What is the best programming language?';
    
    const response = await llmClient.ask(prompt);
    
    // Should acknowledge subjectivity
    const content = response.content.toLowerCase();
    const acknowledgesSubjectivity = 
      content.includes('depends') || 
      content.includes('subjective') ||
      content.includes('varies') ||
      content.includes('context');
    
    expect(acknowledgesSubjectivity).toBe(true);
  }, 30000);

  test('should summarize text concisely', async () => {
    const longText = `
      Artificial Intelligence (AI) is transforming how we work and live. 
      Machine learning algorithms can now process vast amounts of data to find patterns. 
      Natural language processing enables computers to understand human language. 
      Computer vision allows machines to interpret images and videos.
    `;
    const prompt = `Summarize this in one sentence: ${longText}`;
    
    const response = await llmClient.ask(prompt);
    
    // Summary should be much shorter than original
    expect(response.content.length).toBeLessThan(longText.length);
    // Should mention AI or artificial intelligence
    expect(response.content.toLowerCase()).toMatch(/ai|artificial intelligence/);
  }, 30000);
});
