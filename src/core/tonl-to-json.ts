/**
 * TONL to JSON Parser
 * Converts TONL format back to JSON
 */

/**
 * Convert TONL type to TypeScript value
 */
export function tonlTypeToValue(value: string, type: string): unknown {
  const trimmed = value.trim();
  
  // Handle quoted strings
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1); // Remove quotes
  }
  
  switch (type) {
    case 'i32':
    case 'i64':
    case 'f32':
    case 'f64':
      return Number(trimmed);
    
    case 'bool':
      return trimmed === 'true';
    
    case 'null':
      return null;
    
    case 'str':
      return trimmed;
    
    case 'arr':
      // Simple array parsing: [1,2,3]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const content = trimmed.slice(1, -1);
        return content.split(',').map(v => v.trim());
      }
      return [];
    
    case 'obj':
      // Try to parse as JSON
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    
    default:
      return trimmed;
  }
}

/**
 * Parse TONL header to extract schema
 * 
 * @example
 * parseHeader("users[2]{id:i32,name:str}")
 * // Returns: { name: "users", count: 2, schema: { id: "i32", name: "str" } }
 */
export function parseTonlHeader(header: string): {
  name: string;
  count: number;
  schema: Record<string, string>;
} {
  // Regex: name[count]{key:type,key:type}
  const match = header.match(/^(\w+)\[(\d+)\]\{([^}]+)\}$/);
  
  if (!match) {
    throw new Error(`Invalid TONL header: ${header}`);
  }
  
  const name = match[1];
  const count = parseInt(match[2]);
  const schemaStr = match[3];
  
  // Parse schema: "id:i32,name:str" → { id: "i32", name: "str" }
  const schema: Record<string, string> = {};
  
  schemaStr.split(',').forEach(entry => {
    const [key, type] = entry.split(':');
    schema[key.trim()] = type.trim();
  });
  
  return { name, count, schema };
}

/**
 * Convert TONL string to JSON array
 * 
 * @param tonl - TONL formatted string
 * @returns Array of objects
 * 
 * @example
 * const tonl = `users[2]{id:i32,name:str}:
 *   1, Alice
 *   2, Bob`;
 * 
 * tonlToJson(tonl)
 * // Returns: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
 */
export function tonlToJson(tonl: string): Record<string, unknown>[] {
  const lines = tonl.split('\n').map(l => l.trim()).filter(l => l);
  
  if (lines.length === 0) {
    return [];
  }
  
  // First line is header (ends with :)
  const headerLine = lines[0].replace(/:$/, '');
  const { schema } = parseTonlHeader(headerLine);
  
  // Rest are data rows
  const dataLines = lines.slice(1);
  
  // Parse each row
  const result = dataLines.map(line => {
    const obj: Record<string, unknown> = {};
    const keys = Object.keys(schema);
    
    // Split by comma (but respect quoted strings)
    const values = splitRespectingQuotes(line);
    
    // Map values to keys with type conversion
    keys.forEach((key, index) => {
      if (index < values.length) {
        const type = schema[key];
        obj[key] = tonlTypeToValue(values[index], type);
      }
    });
    
    return obj;
  });
  
  return result;
}

/**
 * Split string by comma, but respect quoted strings
 * 
 * @example
 * splitRespectingQuotes('1, "Alice Smith", 25')
 * // Returns: ['1', '"Alice Smith"', '25']
 */
export function splitRespectingQuotes(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current) {
    result.push(current.trim());
  }
  
  return result;
}