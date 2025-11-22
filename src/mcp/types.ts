/**
 * MCP Server Types for TONL-MCP Bridge
 */

import z from 'zod';

/**
 * Convert to TONL tool input schema
 */
export const ConvertToTonlSchema = z.object({
  data: z.union([z.array(z.any()), z.record(z.any())]),
  name: z.string().default('data'),
  options: z
    .object({
      optimize: z.boolean().default(true),
      flattenNested: z.boolean().default(false),
      includeStats: z.boolean().default(true),
    })
    .optional()
    .default({}),
});

export type ConvertToTonlInput = z.infer<typeof ConvertToTonlSchema>;

/**
 * Parse TONL tool input schema
 */
export const ParseTonlSchema = z.object({
  tonl: z.string(),
  validateSchema: z.boolean().default(false),
});

export type ParseTonlInput = z.infer<typeof ParseTonlSchema>;

/**
 * Validate schema tool input schema
 */
export const ValidateSchemaSchema = z.object({
  data: z.union([z.array(z.any()), z.record(z.any())]),
  strict: z.boolean().default(true),
});

export type ValidateSchemaInput = z.infer<typeof ValidateSchemaSchema>;

/**
 * Calculate savings tool input schema
 */
export const CalculateSavingsSchema = z.object({
  jsonData: z.string(),
  tonlData: z.string(),
  model: z
    .enum([
      'gpt-5',
      'gpt-4',
      'gpt-3.5-turbo',
      'claude-4-opus',
      'claude-4-sonnet',
      'claude-sonnet-4.5',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ])
    .default('gpt-5'),
});

export type CalculateSavingsInput = z.infer<typeof CalculateSavingsSchema>;

/**
 * Server configuration
 */
export interface McpServerConfig {
  name: string;
  version: string;
  port?: number;
  enableResources?: boolean;
  enablePrompts?: boolean;
}

/**
 * Tool response with stats
 */
export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  stats?: {
    originalTokens?: number;
    compressedTokens?: number;
    savedTokens?: number;
    savingsPercent?: number;
  };
}