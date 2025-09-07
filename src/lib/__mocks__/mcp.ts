/**
 * Mock MCP Tools for Testing
 */

export const mcp_sequential_thinking_sequentialthinking = jest.fn();
export const mcp_Context7_resolve_library_id = jest.fn();
export const mcp_Context7_get_library_docs = jest.fn();
export const mcp_duckduckgo_search = jest.fn();
export const isMCPAvailable = jest.fn(() => true);
export const getMCPStatus = jest.fn(() => Promise.resolve({
  sequentialThinking: true,
  context7: true,
  duckduckgo: true
}));