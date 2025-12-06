/**
 * Privacy & Anonymization Module
 * 
 * Provides intelligent data masking and redaction for sensitive fields.
 * Supports nested objects and smart masking that preserves data format context.
 * 
 * @module privacy
 * @since 1.0.0
 */

export type AnonymizeMode = 'redact' | 'mask';

export interface PrivacyOptions {
  /** Field names to anonymize (supports nested paths like 'user.email') */
  fields: string[];
  /** Anonymization mode: 'redact' (replace with [REDACTED]) or 'mask' (smart masking) */
  mode?: AnonymizeMode;
}

/**
 * Intelligently masks a value based on its type and content.
 * 
 * Examples:
 * - Email: 'alice@example.com' → 'a***@example.com'
 * - String: 'password123' → 'p***3'
 * - Short string: 'hi' → '***'
 * - Number: 123456 → '***'
 * 
 * @param value - The value to mask
 * @returns Masked string representation
 */
function maskValue(value: unknown): string {
  if (typeof value === 'string') {
    // Email masking: preserve first char of local part and full domain
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      if (local.length > 0) {
        return `${local.charAt(0)}***@${domain}`;
      }
      return `***@${domain}`;
    }
    
    // SSN masking: XXX-XX-1234 (check BEFORE phone to avoid false matches)
    if (/^\d{3}-\d{2}-\d{4}$/.test(value)) {
      const last4 = value.slice(-4);
      return `***-**-${last4}`;
    }
    
    // Credit card masking: ****-****-****-4532 (check BEFORE phone)
    if (/^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/.test(value)) {
      const cleaned = value.replace(/\D/g, '');
      const last4 = cleaned.slice(-4);
      return `****-****-****-${last4}`;
    }
    
    // Phone number masking (basic patterns) - AFTER SSN/CC check
    if (/^\+?\d[\d\s\-()]{7,}$/.test(value)) {
      // Keep last 4 digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length >= 4) {
        const last4 = cleaned.slice(-4);
        return `***-***-${last4}`;
      }
    }
    
    // Generic string masking: preserve first and last char
    if (value.length > 2) {
      return `${value.charAt(0)}***${value.charAt(value.length - 1)}`;
    }
    
    // Very short strings
    if (value.length > 0) {
      return '***';
    }
  }
  
  // Numbers, booleans, etc.
  if (typeof value === 'number') {
    return '***';
  }
  
  // Fallback for any other type
  return '***';
}

/**
 * Deep clones an object or array to avoid side effects.
 * 
 * @param data - Data to clone
 * @returns Deep cloned copy
 */
function deepClone(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => deepClone(item));
  }
  
  if (data instanceof Date) {
    return new Date(data.getTime());
  }
  
  const clone: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      clone[key] = deepClone(data[key]);
    }
  }
  
  return clone;
}

/**
 * Checks if a field path matches the current traversal path.
 * Supports both direct key matching and nested path matching.
 * 
 * Examples:
 * - 'email' matches key 'email' at any level
 * - 'user.email' matches only 'email' inside 'user' object
 * 
 * @param fieldPath - The field path to check (e.g., 'user.email')
 * @param currentPath - Current traversal path
 * @param currentKey - Current key being processed
 * @returns True if the path matches
 */
function matchesFieldPath(fieldPath: string, currentPath: string, currentKey: string): boolean {
  // Build full path for current key
  const fullPath = currentPath ? `${currentPath}.${currentKey}` : currentKey;
  
  // Check exact path match (for nested paths like 'user.email')
  if (fieldPath === fullPath) {
    return true;
  }
  
  // Check if field path matches just the key name (for simple fields like 'password')
  // This allows 'password' to match at any depth
  if (fieldPath === currentKey) {
    return true;
  }
  
  return false;
}

/**
 * Recursively anonymizes data based on privacy options.
 * 
 * Features:
 * - Deep cloning to avoid side effects
 * - Recursive traversal for nested objects
 * - Support for both arrays and objects
 * - Field name matching at any depth
 * - Nested path support (e.g., 'user.email')
 * 
 * @param data - Data to anonymize (object or array)
 * @param options - Privacy options including fields and mode
 * @param currentPath - Current path in the object tree (for nested matching)
 * @returns Anonymized copy of the data
 */
export function anonymizeData(
  data: any,
  options: PrivacyOptions,
  currentPath: string = ''
): any {
  // Handle primitives
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data !== 'object') {
    return data;
  }
  
  // Deep clone to avoid side effects
  const clone = deepClone(data);
  
  // Handle arrays
  if (Array.isArray(clone)) {
    return clone.map(item => anonymizeData(item, options, currentPath));
  }
  
  // Handle objects
  const mode = options.mode || 'redact';
  const redactedValue = '[REDACTED]';
  
  for (const key in clone) {
    if (!Object.prototype.hasOwnProperty.call(clone, key)) {
      continue;
    }
    
    // Check if this field should be anonymized
    let shouldAnonymize = false;
    for (const fieldPath of options.fields) {
      if (matchesFieldPath(fieldPath, currentPath, key)) {
        shouldAnonymize = true;
        break;
      }
    }
    
    if (shouldAnonymize) {
      // Skip null/undefined values - don't anonymize them
      if (clone[key] === null || clone[key] === undefined) {
        continue;
      }
      // Anonymize the value
      clone[key] = mode === 'mask' ? maskValue(clone[key]) : redactedValue;
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      // Recurse into nested objects/arrays
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      clone[key] = anonymizeData(clone[key], options, newPath);
    }
  }
  
  return clone;
}

/**
 * Convenience function for redacting fields (always uses [REDACTED]).
 * 
 * @param data - Data to redact
 * @param fields - Field names to redact
 * @returns Data with redacted fields
 */
export function redactFields(data: any, fields: string[]): any {
  return anonymizeData(data, { fields, mode: 'redact' });
}

/**
 * Convenience function for masking fields (smart masking).
 * 
 * @param data - Data to mask
 * @param fields - Field names to mask
 * @returns Data with masked fields
 */
export function maskFields(data: any, fields: string[]): any {
  return anonymizeData(data, { fields, mode: 'mask' });
}
