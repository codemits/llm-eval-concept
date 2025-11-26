import { z } from 'zod';

/**
 * Schema validators for structured LLM outputs
 * Uses Zod for runtime type validation
 */

// Example: Person schema
export const PersonSchema = z.object({
  name: z.string(),
  age: z.number().int().positive(),
  email: z.string().email().optional(),
});

// Example: Task list schema
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  priority: z.enum(['low', 'medium', 'high']),
});

export const TaskListSchema = z.object({
  tasks: z.array(TaskSchema),
});

// Example: API response schema
export const APIResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.record(z.any()).optional(),
  message: z.string(),
});

/**
 * Validate LLM JSON response against a schema
 */
export function validateSchema<T>(
  response: string,
  schema: z.ZodSchema<T>
): { valid: boolean; data?: T; errors?: string[] } {
  try {
    const parsed = JSON.parse(response);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return { valid: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { valid: false, errors };
    }
  } catch (error) {
    return { 
      valid: false, 
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    };
  }
}

/**
 * Extract JSON from markdown code blocks
 */
export function extractJSON(response: string): string {
  // Try to extract JSON from code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return response;
}
