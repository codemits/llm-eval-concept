import OpenAI from 'openai';
import { LLMConfig, LLMResponse } from '../types';

/**
 * LLMClient - A wrapper for interacting with LLM APIs
 * Supports OpenAI and Azure OpenAI
 */
export class LLMClient {
  private client: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    
    // Configure for Azure OpenAI if azure config is provided
    if (config.azureEndpoint) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: `${config.azureEndpoint}/openai/deployments/${config.azureDeploymentName}`,
        defaultQuery: { 'api-version': config.azureApiVersion || '2024-08-01-preview' },
        defaultHeaders: { 'api-key': config.apiKey },
      });
    } else {
      // Standard OpenAI configuration
      this.client = new OpenAI({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Send a prompt to the LLM and get a response
   */
  async ask(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      // Use max_completion_tokens for newer models (GPT-5), max_tokens for older ones
      const completionParams: any = {
        model: this.config.model,
        messages,
      };
      
      // GPT-5 and o1 models have restrictions
      const isRestrictedModel = this.config.model.includes('gpt-5') || this.config.model.includes('o1');
      
      if (isRestrictedModel) {
        // GPT-5/o1: temperature must be 1 (default), use max_completion_tokens
        completionParams.max_completion_tokens = this.config.maxTokens ?? 1000;
      } else {
        // Older models: support temperature and max_tokens
        completionParams.temperature = this.config.temperature ?? 0.7;
        completionParams.max_tokens = this.config.maxTokens ?? 1000;
      }

      const response = await this.client.chat.completions.create(completionParams);

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      return {
        content,
        model: response.model,
        tokensUsed,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`LLM API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ask multiple times for consistency testing
   */
  async askMultiple(prompt: string, count: number, systemPrompt?: string): Promise<LLMResponse[]> {
    const promises = Array.from({ length: count }, () => 
      this.ask(prompt, systemPrompt)
    );
    return Promise.all(promises);
  }

  /**
   * Calculate cost per request (approximate, based on GPT-4 pricing)
   */
  calculateCost(tokensUsed: number): number {
    // Example pricing: GPT-4 Turbo - $0.01 per 1K input tokens, $0.03 per 1K output tokens
    // Simplified: average of $0.02 per 1K tokens
    return (tokensUsed / 1000) * 0.02;
  }
}
