/**
 * Enhanced TONL to JSON Parser
 * Now with extended type support
 */

/**
 * Convert TONL type string to actual JavaScript value
 */
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
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const content = trimmed.slice(1, -1);
        if (content.length === 0) return [];
        return content.split(',').map((v) => v.trim());
      }
      return [];

    case 'obj':
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
 * Parse TONL header to extract metadata
 */
export function parseTonlHeader(header: string): {
  name: string;
  count: number;
  schema: Record<string, string>;
} {
  const match = header.match(/^(\w+)\[(\d+)\]\{([^}]+)\}$/);

  if (!match) {
    throw new Error(`Invalid TONL header: ${header}`);
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
 * Split string by comma, but respect quoted strings
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
