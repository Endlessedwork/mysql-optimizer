import { validateIdentifier, validateIdentifiers } from '../utils/sql-validator';

describe('SQL Identifier Validator', () => {
  describe('validateIdentifier', () => {
    it('accepts valid simple identifier', () => {
      expect(validateIdentifier('users')).toBe('users');
    });

    it('accepts identifier with underscore', () => {
      expect(validateIdentifier('user_accounts')).toBe('user_accounts');
    });

    it('accepts identifier starting with underscore', () => {
      expect(validateIdentifier('_temp')).toBe('_temp');
    });

    it('accepts identifier with numbers', () => {
      expect(validateIdentifier('table2')).toBe('table2');
    });

    it('rejects empty string', () => {
      expect(() => validateIdentifier('')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with backtick', () => {
      expect(() => validateIdentifier('table`; DROP TABLE users;--')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with semicolon', () => {
      expect(() => validateIdentifier('table; DROP TABLE')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with spaces', () => {
      expect(() => validateIdentifier('my table')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier starting with number', () => {
      expect(() => validateIdentifier('123abc')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier longer than 64 chars', () => {
      expect(() => validateIdentifier('a'.repeat(65))).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with dash', () => {
      expect(() => validateIdentifier('my-table')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with parentheses', () => {
      expect(() => validateIdentifier('col1)')).toThrow('Invalid SQL identifier');
    });
  });

  describe('validateIdentifiers', () => {
    it('accepts array of valid identifiers', () => {
      expect(validateIdentifiers(['col1', 'col2', 'col3'])).toEqual(['col1', 'col2', 'col3']);
    });

    it('rejects if any identifier is invalid', () => {
      expect(() => validateIdentifiers(['col1', 'col2; DROP', 'col3'])).toThrow('Invalid SQL identifier');
    });

    it('rejects empty array', () => {
      expect(() => validateIdentifiers([])).toThrow('At least one identifier required');
    });
  });
});
