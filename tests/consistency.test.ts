import { LLMClient } from '../src/client/llm-client';
import { LLMResponse } from '../src/types';

/**
 * Consistency Tests - Verify stability across multiple responses
 */

describe('Consistency Tests', () => {
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
      temperature: 0.3, // Some variation allowed (ignored for GPT-5)
    });
  });

  test('should provide consistent factual answers', async () => {
    const prompt = 'What is the speed of light in vacuum? Provide the value in meters per second.';
    const iterations = 3;

    const responses = await llmClient.askMultiple(prompt, iterations);

    // All responses should mention the same value (approximately)
    const values = responses.map((r: LLMResponse) => {
      const match = r.content.match(/299,?792,?458|3\.?0+\s*[×x]\s*10\^?8/i);
      return match !== null;
    });

    expect(values.every((v: boolean) => v)).toBe(true);
  }, 60000);

  test('should have low variation for deterministic tasks', async () => {
    const prompt = 'Convert 100 USD to EUR using an exchange rate of 0.85. Give only the number.';
    const iterations = 5;

    const responses = await llmClient.askMultiple(prompt, iterations);

    // Extract numbers from responses
    const numbers = responses.map((r: LLMResponse) => {
      const match = r.content.match(/\d+(\.\d+)?/);
      return match ? parseFloat(match[0]) : 0;
    });

    // All should be 85 (or very close)
    const allCorrect = numbers.every((n: number) => Math.abs(n - 85) < 1);
    expect(allCorrect).toBe(true);
  }, 90000);

  test('should measure response variation', async () => {
    const prompt = 'Name a popular programming language';
    const iterations = 5;

    const responses = await llmClient.askMultiple(prompt, iterations);
    const contents = responses.map((r: LLMResponse) => r.content.trim().toLowerCase());

    // Count unique responses
    const uniqueResponses = new Set(contents).size;

    // With temperature 0.3, might get some variation
    console.log(`Unique responses: ${uniqueResponses}/${iterations}`);
    console.log('Responses:', contents);

    // Should have at least 1 response (no complete failures)
    expect(uniqueResponses).toBeGreaterThanOrEqual(1);
  }, 90000);

  test('should track latency consistency', async () => {
    const prompt = 'What is 2 + 2?';
    const iterations = 5;

    const responses = await llmClient.askMultiple(prompt, iterations);
    const latencies = responses.map((r: LLMResponse) => r.latencyMs);

    // Calculate average and standard deviation
    const avg = latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length;
    const variance = latencies.reduce((sum: number, lat: number) => sum + Math.pow(lat - avg, 2), 0) / latencies.length;
    const stdDev = Math.sqrt(variance);

    console.log(`Average latency: ${avg.toFixed(2)}ms`);
    console.log(`Std deviation: ${stdDev.toFixed(2)}ms`);

    // Latencies should be within reasonable range
    expect(avg).toBeLessThan(10000); // Less than 10 seconds average
  }, 90000);
});
