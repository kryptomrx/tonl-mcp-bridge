/**
 * Enhanced TONL to JSON Parser
 * Now with extended type support
 */
/**
 * Convert TONL type string to actual JavaScript value
 */

import { TonlParseError, createDetailedError } from '../utils/errors.js';


export function tonlTypeToValue(value: string, type: string): unknown {
  const trimmed = value.trim();
  
  // Handle quoted strings (remove quotes and unescape)
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const unquoted = trimmed.slice(1, -1);
    return unquoted
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  
  // Convert based on type
  switch (type) {
    // All integer types
    case 'i8':
    case 'i16':
    case 'i32':
    case 'i64':
    // All float types
    case 'f32':
    case 'f64':
      return Number(trimmed);
    
    case 'bool':
      return trimmed === 'true';
    
    case 'null':
      return null;
    
    case 'str':
      return trimmed;
    
    case 'date':
      return trimmed;
    
    case 'datetime':
      return trimmed;
    
    case 'arr':
      // Parse array with nested support
      return parseNestedObject(trimmed);
    
    case 'obj':
      // Parse object with nested support
      return parseNestedObject(trimmed);
    
    default:
      return trimmed;
  }
}

/**
 * Parse TONL header to extract metadata
 */
export function parseTonlHeader(header: string): {
  name: string;
  count: number;
  schema: Record<string, string>;
} {
  const match = header.match(/^(\w+)\[(\d+)\]\{([^}]+)\}$/);


if (!match) {
  throw new TonlParseError(
    createDetailedError('Invalid TONL header format', {
      input: header,
      expected: 'name[count]{field:type,field:type}',
      received: header,
    })
  );
}





  const name = match[1];
  const count = parseInt(match[2], 10);
  const schemaStr = match[3];

  const schema: Record<string, string> = {};

  schemaStr.split(',').forEach((entry) => {
    const [key, type] = entry.split(':');
    schema[key.trim()] = type.trim();
  });

  return { name, count, schema };
}

/**
 * Convert TONL string to JSON array
 */
export function tonlToJson(tonl: string): Record<string, unknown>[] {
  const lines = tonl
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  if (lines.length === 0) {
    return [];
  }

  const headerLine = lines[0].replace(/:$/, '');
  const { schema } = parseTonlHeader(headerLine);

  const dataLines = lines.slice(1);

  const result = dataLines.map((line) => {
    const obj: Record<string, unknown> = {};
    const keys = Object.keys(schema);

    const values = splitRespectingQuotes(line);

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
 * Split string by comma, but respect quoted strings AND nested objects/arrays
 */
export function splitRespectingQuotes(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let depth = 0; // Track nesting depth
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '"' && (i === 0 || str[i-1] !== '\\')) {
      inQuotes = !inQuotes;
      current += char;
    } else if (!inQuotes) {
      // Track nested structures
      if (char === '{' || char === '[') {
        depth++;
        current += char;
      } else if (char === '}' || char === ']') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        // Only split on comma at depth 0
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    result.push(current.trim());
  }
  
  return result;
}
/**
 * Parse nested object from TONL format
 */
function parseNestedObject(str: string): unknown {
  const trimmed = str.trim();
  
  // Parse object: {key:value,key:value}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const content = trimmed.slice(1, -1);
    if (!content) return {};
    
    const obj: Record<string, unknown> = {};
    const pairs = splitNestedPairs(content);
    
    pairs.forEach(pair => {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) return;
      
      const key = pair.slice(0, colonIndex).trim();
      const value = pair.slice(colonIndex + 1).trim();
      obj[key] = parseNestedValue(value);
    });
    
    return obj;
  }
  
  // Parse array: [item,item,item]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const content = trimmed.slice(1, -1);
    if (!content) return [];
    
    return splitNestedPairs(content).map(item => parseNestedValue(item.trim()));
  }
  
  return trimmed;
}

/**
 * Parse nested value (recursive)
 */
function parseNestedValue(value: string): unknown {
  const trimmed = value.trim();
  
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  
  // Check if it's a number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  
  // Check if it's nested object or array
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseNestedObject(trimmed);
  }
  
  return trimmed;
}

/**
 * Split by comma, respecting nested braces
 */
function splitNestedPairs(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '{' || char === '[') {
      depth++;
      current += char;
    } else if (char === '}' || char === ']') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) {
        result.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    result.push(current.trim());
  }
  
  return result;
}