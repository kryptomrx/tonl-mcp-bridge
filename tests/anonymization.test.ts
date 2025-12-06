import { describe, it, expect } from 'vitest';
import { jsonToTonl } from '../src/core/json-to-tonl';
import { anonymizeData, maskFields, redactFields } from '../src/core/privacy';

describe('Privacy & Anonymization (v1.0.0)', () => {
  
  describe('Basic Redaction', () => {
    const sensitiveData = [
      { id: 1, name: 'Alice', email: 'alice@corp.com', salary: 100000 },
      { id: 2, name: 'Bob', email: 'bob@corp.com', salary: 120000 },
    ];

    it('should redact specified fields with [REDACTED]', () => {
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
      expect(result).toContain('Bob');
    });

    it('should redact multiple fields', () => {
      const data = [
        { id: 1, email: 'test@example.com', ssn: '123-45-6789', phone: '+1-555-0100' }
      ];

      const result = jsonToTonl(data, 'users', {
        anonymize: ['email', 'ssn', 'phone']
      });

      expect(result).not.toContain('test@example.com');
      expect(result).not.toContain('123-45-6789');
      expect(result).not.toContain('+1-555-0100');
      expect(result).toContain('[REDACTED]');
    });
  });

  describe('Smart Masking', () => {
    it('should mask email addresses intelligently', () => {
      const data = [
        { id: 1, email: 'alice@example.com' },
        { id: 2, email: 'bob.smith@company.org' }
      ];

      const result = jsonToTonl(data, 'users', {
        anonymize: ['email'],
        mask: true
      });

      // Should preserve first char and domain
      expect(result).toContain('a***@example.com');
      expect(result).toContain('b***@company.org');
      
      // Should NOT contain original emails
      expect(result).not.toContain('alice@example.com');
      expect(result).not.toContain('bob.smith@');
    });

    it('should mask SSN preserving last 4 digits', () => {
      const data = [
        { id: 1, ssn: '123-45-6789' },
        { id: 2, ssn: '987-65-4321' }
      ];

      const result = jsonToTonl(data, 'records', {
        anonymize: ['ssn'],
        mask: true
      });

      expect(result).toContain('***-**-6789');
      expect(result).toContain('***-**-4321');
      expect(result).not.toContain('123-45');
      expect(result).not.toContain('987-65');
    });

    it('should mask credit card numbers', () => {
      const data = [
        { id: 1, card: '4532-1234-5678-9010' }
      ];

      const result = jsonToTonl(data, 'payments', {
        anonymize: ['card'],
        mask: true
      });

      expect(result).toContain('****-****-****-9010');
      expect(result).not.toContain('4532-1234');
    });

    it('should mask phone numbers preserving last 4 digits', () => {
      const data = [
        { id: 1, phone: '+1-555-123-4567' },
        { id: 2, phone: '555-987-6543' }
      ];

      const result = jsonToTonl(data, 'contacts', {
        anonymize: ['phone'],
        mask: true
      });

      expect(result).toContain('***-***-4567');
      expect(result).toContain('***-***-6543');
    });

    it('should mask generic strings preserving first and last char', () => {
      const data = [
        { id: 1, username: 'alice_wonderland', password: 'mySecretPass123' }
      ];

      const result = jsonToTonl(data, 'accounts', {
        anonymize: ['username', 'password'],
        mask: true
      });

      expect(result).toContain('a***d'); // alice_wonderland -> a***d
      expect(result).toContain('m***3'); // mySecretPass123 -> m***3
    });
  });

  describe('Nested Object Support', () => {
    it('should anonymize fields in nested objects', () => {
      const data = [
        {
          id: 1,
          user: {
            name: 'Alice',
            email: 'alice@secret.com',
            profile: {
              ssn: '123-45-6789'
            }
          }
        }
      ];

      const result = jsonToTonl(data, 'records', {
        anonymize: ['email', 'ssn']
      });

      expect(result).not.toContain('alice@secret.com');
      expect(result).not.toContain('123-45-6789');
      expect(result).toContain('[REDACTED]');
      expect(result).toContain('Alice'); // name should be preserved
    });

    it('should support nested path notation', () => {
      const data = [
        {
          id: 1,
          user: {
            name: 'Alice',
            contact: {
              email: 'alice@example.com',
              phone: '555-1234'
            }
          }
        }
      ];

      const result = jsonToTonl(data, 'records', {
        anonymize: ['user.contact.email']
      });

      expect(result).not.toContain('alice@example.com');
      expect(result).toContain('Alice'); // name preserved
      expect(result).toContain('555-1234'); // phone preserved (not in anonymize list)
    });

    it('should anonymize same field name at any depth', () => {
      const data = [
        {
          id: 1,
          password: 'topLevel',
          user: {
            password: 'nestedLevel',
            profile: {
              password: 'deepNested'
            }
          }
        }
      ];

      const result = jsonToTonl(data, 'records', {
        anonymize: ['password']
      });

      // All password fields should be redacted
      expect(result).not.toContain('topLevel');
      expect(result).not.toContain('nestedLevel');
      expect(result).not.toContain('deepNested');
    });

    it('should work with flattened nested objects', () => {
      const nestedData = [
        { id: 1, user: { email: 'secret@test.com', name: 'Public' } }
      ];

      const result = jsonToTonl(nestedData, 'users', {
        flattenNested: true,
        anonymize: ['user_email']
      });

      expect(result).not.toContain('secret@test.com');
      expect(result).toContain('Public');
      expect(result).toContain('[REDACTED]');
    });
  });

  describe('Privacy Core Functions', () => {
    it('anonymizeData should deep clone to avoid side effects', () => {
      const original = [{ id: 1, email: 'test@example.com' }];
      const anonymized = anonymizeData(original, { 
        fields: ['email'], 
        mode: 'redact' 
      });

      // Original should be unchanged
      expect(original[0].email).toBe('test@example.com');
      expect(anonymized[0].email).toBe('[REDACTED]');
    });

    it('maskFields convenience function should work', () => {
      const data = { email: 'alice@example.com', name: 'Alice' };
      const masked = maskFields(data, ['email']);

      expect(masked.email).toBe('a***@example.com');
      expect(masked.name).toBe('Alice');
    });

    it('redactFields convenience function should work', () => {
      const data = { password: 'secret123', username: 'alice' };
      const redacted = redactFields(data, ['password']);

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.username).toBe('alice');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty anonymize list', () => {
      const data = [{ id: 1, email: 'test@example.com' }];
      const result = jsonToTonl(data, 'users', {
        anonymize: []
      });

      expect(result).toContain('test@example.com');
    });

    it('should handle non-existent field names', () => {
      const data = [{ id: 1, name: 'Alice' }];
      const result = jsonToTonl(data, 'users', {
        anonymize: ['nonexistent', 'alsoMissing']
      });

      expect(result).toContain('Alice');
      expect(result).toContain('1');
    });

    it('should handle null values in anonymized fields', () => {
      const data = [{ id: 1, email: null, name: 'Alice' }];
      const result = jsonToTonl(data, 'users', {
        anonymize: ['email']
      });

      expect(result).toContain('null');
      expect(result).toContain('Alice');
    });

    it('should handle undefined values', () => {
      const data = [{ id: 1, email: undefined, name: 'Alice' }];
      const result = jsonToTonl(data, 'users', {
        anonymize: ['email']
      });

      expect(result).toContain('Alice');
    });

    it('should handle very short strings in masking', () => {
      const data = [{ id: 1, code: 'ab' }];
      const result = jsonToTonl(data, 'records', {
        anonymize: ['code'],
        mask: true
      });

      expect(result).toContain('***');
      expect(result).not.toContain('ab');
    });

    it('should mask numeric values', () => {
      const data = [{ id: 1, amount: 123456 }];
      const result = jsonToTonl(data, 'transactions', {
        anonymize: ['amount'],
        mask: true
      });

      expect(result).toContain('***');
      expect(result).not.toContain('123456');
    });
  });

  describe('Real-World Scenarios', () => {
    it('GDPR compliance: redact PII', () => {
      const users = [
        {
          id: 1,
          name: 'Alice',
          email: 'alice@company.com',
          phone: '+1-555-0100',
          address: '123 Main St',
          passport: 'US123456789'
        }
      ];

      const result = jsonToTonl(users, 'users', {
        anonymize: ['email', 'phone', 'address', 'passport']
      });

      expect(result).toContain('Alice'); // Name OK
      expect(result).toContain('1'); // ID OK
      expect(result).not.toContain('alice@company.com');
      expect(result).not.toContain('+1-555-0100');
      expect(result).not.toContain('123 Main St');
      expect(result).not.toContain('US123456789');
    });

    it('HIPAA compliance: mask patient data', () => {
      const patients = [
        {
          id: 'P001',
          name: 'John Doe',
          ssn: '123-45-6789',
          medicalRecordNumber: 'MRN-98765',
          diagnosis: 'Hypertension'
        }
      ];

      const result = jsonToTonl(patients, 'patients', {
        anonymize: ['ssn', 'medicalRecordNumber'],
        mask: true
      });

      expect(result).toContain('***-**-6789'); // SSN masked
      expect(result).toContain('M***5'); // MRN masked
      expect(result).toContain('Hypertension'); // Diagnosis preserved
    });

    it('Financial data: mask sensitive info', () => {
      const transactions = [
        {
          id: 'TXN001',
          accountNumber: '1234567890',
          routingNumber: '987654321',
          cardNumber: '4532-1234-5678-9010',
          amount: 1500.50
        }
      ];

      const result = jsonToTonl(transactions, 'transactions', {
        anonymize: ['accountNumber', 'routingNumber', 'cardNumber']
      });

      expect(result).not.toContain('1234567890');
      expect(result).not.toContain('987654321');
      expect(result).not.toContain('4532-1234-5678-9010');
      expect(result).toContain('1500.5'); // Amount visible
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        ssn: `${i.toString().padStart(3, '0')}-45-6789`
      }));

      const start = Date.now();
      const result = jsonToTonl(largeDataset, 'users', {
        anonymize: ['email', 'ssn'],
        mask: true
      });
      const duration = Date.now() - start;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(500); // 500ms for 1000 records
      
      // Verify anonymization worked
      expect(result).not.toContain('user0@example.com');
      expect(result).toContain('u***@example.com');
    });
  });
});
