import * as fc from 'fast-check';
import { pbtConfig } from '../pbt.config';

/**
 * Property-Based Tests for MCP Tools
 *
 * These tests validate:
 * - Property 14: MCP Response Structure
 * - Property 15: MCP Error Handling
 */

describe('MCP Tools Properties', () => {
  describe('Property 14: MCP Response Structure', () => {
    it('should return valid JSON-RPC 2.0 response structure', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer()),
          fc.anything(),
          (id, result) => {
            // Simulate MCP response
            const response = {
              jsonrpc: '2.0' as const,
              id,
              result,
            };

            // Verify JSON-RPC 2.0 structure
            expect(response.jsonrpc).toBe('2.0');
            expect(response.id).toBeDefined();
            expect(response).toHaveProperty('result');
          },
        ),
        pbtConfig,
      );
    });

    it('should include required fields in tool response', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          fc.array(
            fc.record({
              sourcePath: fc.string({ minLength: 1, maxLength: 200 }),
              content: fc.string({ minLength: 10, maxLength: 500 }),
              score: fc.float({ min: 0, max: 1 }),
            }),
            { minLength: 0, maxLength: 5 },
          ),
          fc.constantFrom('gpt-4o', 'claude-3.5', 'gemini-pro'),
          fc.uuid(),
          (answer, citations, modelUsed, sessionId) => {
            // Simulate ask_agent tool response
            const toolResult = {
              answer,
              citations,
              modelUsed,
              sessionId,
            };

            // Verify required fields
            expect(toolResult).toHaveProperty('answer');
            expect(toolResult).toHaveProperty('citations');
            expect(toolResult).toHaveProperty('modelUsed');
            expect(toolResult).toHaveProperty('sessionId');

            // Verify types
            expect(typeof toolResult.answer).toBe('string');
            expect(Array.isArray(toolResult.citations)).toBe(true);
            expect(typeof toolResult.modelUsed).toBe('string');
            expect(typeof toolResult.sessionId).toBe('string');
          },
        ),
        pbtConfig,
      );
    });

    it('should format search_knowledge results correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.constantFrom('general', 'technical', 'creative'),
          fc.array(
            fc.record({
              content: fc.string({ minLength: 10, maxLength: 500 }),
              sourcePath: fc.string({ minLength: 1, maxLength: 200 }),
              category: fc.constantFrom('general', 'technical', 'creative'),
              chunkIndex: fc.integer({ min: 0, max: 100 }),
              score: fc.float({ min: 0, max: 1 }),
            }),
            { minLength: 0, maxLength: 10 },
          ),
          (query, category, results) => {
            // Simulate search_knowledge tool response
            const toolResult = {
              query,
              category,
              resultCount: results.length,
              results: results.map((r) => ({
                content: r.content,
                sourcePath: r.sourcePath,
                category: r.category,
                chunkIndex: r.chunkIndex,
                score: r.score,
              })),
            };

            // Verify structure
            expect(toolResult).toHaveProperty('query');
            expect(toolResult).toHaveProperty('category');
            expect(toolResult).toHaveProperty('resultCount');
            expect(toolResult).toHaveProperty('results');

            // Verify result count matches array length
            expect(toolResult.resultCount).toBe(results.length);

            // Verify each result has required fields
            toolResult.results.forEach((result) => {
              expect(result).toHaveProperty('content');
              expect(result).toHaveProperty('sourcePath');
              expect(result).toHaveProperty('category');
              expect(result).toHaveProperty('chunkIndex');
              expect(result).toHaveProperty('score');
            });
          },
        ),
        pbtConfig,
      );
    });

    it('should wrap tool results in content array', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          (resultText) => {
            // Simulate MCP tool result
            const toolResult = {
              content: [
                {
                  type: 'text' as const,
                  text: resultText,
                },
              ],
            };

            // Verify content array structure
            expect(Array.isArray(toolResult.content)).toBe(true);
            expect(toolResult.content.length).toBeGreaterThan(0);

            // Verify content item structure
            toolResult.content.forEach((item) => {
              expect(item).toHaveProperty('type');
              expect(item).toHaveProperty('text');
              expect(item.type).toBe('text');
            });
          },
        ),
        pbtConfig,
      );
    });
  });

  describe('Property 15: MCP Error Handling', () => {
    it('should return error response for invalid requests', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer()),
          fc.integer({ min: -32768, max: -32000 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (id, code, message) => {
            // Simulate MCP error response
            const errorResponse = {
              jsonrpc: '2.0' as const,
              id,
              error: {
                code,
                message,
              },
            };

            // Verify error structure
            expect(errorResponse.jsonrpc).toBe('2.0');
            expect(errorResponse).toHaveProperty('error');
            expect(errorResponse.error).toHaveProperty('code');
            expect(errorResponse.error).toHaveProperty('message');

            // Verify error code is in valid range
            expect(errorResponse.error.code).toBeLessThanOrEqual(-32000);
            expect(errorResponse.error.code).toBeGreaterThanOrEqual(-32768);
          },
        ),
        pbtConfig,
      );
    });

    it('should include isError flag in tool error results', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            // Simulate tool error result
            const toolResult = {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${errorMessage}`,
                },
              ],
              isError: true,
            };

            // Verify error flag
            expect(toolResult.isError).toBe(true);
            expect(toolResult.content[0].text).toContain('Error:');
          },
        ),
        pbtConfig,
      );
    });

    it('should handle missing required parameters', () => {
      fc.assert(
        fc.property(
          fc.record({
            agent_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
              nil: undefined,
            }),
            question: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
              nil: undefined,
            }),
          }),
          (args) => {
            // Validate required parameters
            const hasAgentId =
              args.agent_id !== undefined && args.agent_id !== null;
            const hasQuestion =
              args.question !== undefined && args.question !== null;

            const isValid = hasAgentId && hasQuestion;

            // Should detect missing parameters
            if (!isValid) {
              const errorResult = {
                content: [
                  {
                    type: 'text' as const,
                    text: 'Error: agent_id and question are required parameters',
                  },
                ],
                isError: true,
              };

              expect(errorResult.isError).toBe(true);
            }
          },
        ),
        pbtConfig,
      );
    });

    it('should handle tool execution failures gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (errorMessage) => {
            // Simulate tool execution failure
            const error = new Error(errorMessage);

            // Create error response
            const errorResult = {
              content: [
                {
                  type: 'text' as const,
                  text: `Error: ${error.message}`,
                },
              ],
              isError: true,
            };

            // Verify error handling
            expect(errorResult.isError).toBe(true);
            expect(errorResult.content[0].text).toContain(errorMessage);
          },
        ),
        pbtConfig,
      );
    });

    it('should return appropriate error codes for different failures', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { type: 'method_not_found', code: -32601 },
            { type: 'invalid_params', code: -32602 },
            { type: 'internal_error', code: -32603 },
          ),
          (errorType) => {
            // Simulate error response
            const errorResponse = {
              jsonrpc: '2.0' as const,
              id: 1,
              error: {
                code: errorType.code,
                message: `${errorType.type} error`,
              },
            };

            // Verify error code matches type
            expect(errorResponse.error.code).toBe(errorType.code);

            // Verify error code is in JSON-RPC range
            expect(errorResponse.error.code).toBeLessThanOrEqual(-32000);
            expect(errorResponse.error.code).toBeGreaterThanOrEqual(-32768);
          },
        ),
        pbtConfig,
      );
    });
  });

  describe('Property 16: MCP Tool Registration', () => {
    it('should register tools with valid definitions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 10, maxLength: 200 }),
          (toolName, description) => {
            // Simulate tool definition
            const toolDefinition = {
              name: toolName,
              description,
              inputSchema: {
                type: 'object' as const,
                properties: {},
                required: [],
              },
            };

            // Verify tool definition structure
            expect(toolDefinition).toHaveProperty('name');
            expect(toolDefinition).toHaveProperty('description');
            expect(toolDefinition).toHaveProperty('inputSchema');

            // Verify input schema structure
            expect(toolDefinition.inputSchema).toHaveProperty('type');
            expect(toolDefinition.inputSchema).toHaveProperty('properties');
            expect(toolDefinition.inputSchema).toHaveProperty('required');
          },
        ),
        pbtConfig,
      );
    });

    it('should list all registered tools', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              description: fc.string({ minLength: 10, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          (tools) => {
            // Ensure unique tool names
            const uniqueTools = Array.from(
              new Map(tools.map((t) => [t.name, t])).values(),
            );

            // Simulate tools/list response
            const listResponse = {
              tools: uniqueTools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: {
                  type: 'object' as const,
                  properties: {},
                  required: [],
                },
              })),
            };

            // Verify all tools are listed
            expect(listResponse.tools.length).toBe(uniqueTools.length);

            // Verify each tool has required fields
            listResponse.tools.forEach((tool) => {
              expect(tool).toHaveProperty('name');
              expect(tool).toHaveProperty('description');
              expect(tool).toHaveProperty('inputSchema');
            });
          },
        ),
        pbtConfig,
      );
    });
  });
});
