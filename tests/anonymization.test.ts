import { describe, it, expect } from 'vitest';
import { jsonToTonl } from '../src/core/json-to-tonl.js';

describe('Data Anonymization', () => {
  const sensitiveData = [
    { id: 1, name: 'Alice', email: 'alice@corp.com', salary: 100000 },
    { id: 2, name: 'Bob', email: 'bob@corp.com', salary: 120000 },
  ];

  it('should redact specified fields', () => {
    const result = jsonToTonl(sensitiveData, 'staff', {
      anonymize: ['email', 'salary']
    });

    // Check structure
    expect(result).toContain('staff[2]');
    
    // Check redaction
    expect(result).not.toContain('alice@corp.com');
    expect(result).not.toContain('100000');
    expect(result).toContain('[REDACTED]');
    
    // Check preservation of other fields
    expect(result).toContain('Alice');
    expect(result).toContain('1');
  });

  it('should work with flattened nested objects', () => {
    const nestedData = [
      { id: 1, user: { email: 'secret@test.com', name: 'Public' } }
    ];

    // With flattening: user.email -> user_email
    const result = jsonToTonl(nestedData, 'users', {
      flattenNested: true,
      anonymize: ['user_email']
    });

    expect(result).not.toContain('secret@test.com');
    expect(result).toContain('Public');
    expect(result).toContain('[REDACTED]');
  });
});