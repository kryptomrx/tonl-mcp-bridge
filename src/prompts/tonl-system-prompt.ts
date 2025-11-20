/**
 * TONL System Prompt
 * Explains TONL format to LLMs for proper parsing
 *
 * Use this in your prompts when sending TONL data to Claude, GPT, etc.
 */

export const TONL_SYSTEM_PROMPT = `
The following data is in TONL format. Parse it as follows:

- Lines with [count]{fields}: are array headers, data rows follow
- Lines with {fields}: are object headers, field: value pairs follow
- Indentation (2 spaces) indicates nesting levels
- Default delimiter is comma unless #delimiter header specifies otherwise
- Type hints may appear: field:type (e.g., id:u32, name:str, active:bool)
  → Ignore the :type part, just parse the values
- Value types: unquoted numbers/booleans, quoted strings, null
- v2.0 Optimization: May contain #optimize directives (ignore these, they're metadata)

Examples:
Without types (compact):
users[2]{id,name,role}:
  1, Alice, admin
  2, Bob, user

With types (validation):
users[2]{id:u32,name:str,role:str}:
  1, Alice, admin
  2, Bob, user

With optimization (v2.0):
#optimize dictionary delta bitpack
users[2]{id:u32,name:str,role:str}:
  1, Alice, admin
  2, Bob, user

All represent: [{"id":1,"name":"Alice","role":"admin"}, {"id":2,"name":"Bob","role":"user"}]

TONL v2.0 provides 60% additional compression while maintaining full LLM compatibility.
`.trim();

/**
 * Build a complete prompt with TONL data
 *
 * @param tonlData - TONL formatted string
 * @param userQuery - User's question
 * @returns Complete prompt for LLM
 *
 * @example
 * const prompt = buildTonlPrompt(tonlData, "What are the top users?");
 * const response = await llm.complete(prompt);
 */
export function buildTonlPrompt(tonlData: string, userQuery: string): string {
  return `${TONL_SYSTEM_PROMPT}

Context (TONL format):
${tonlData}

User Query: ${userQuery}

Please answer based on the TONL data provided above.`;
}
