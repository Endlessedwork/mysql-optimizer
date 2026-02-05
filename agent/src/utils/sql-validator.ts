// Strict MySQL identifier pattern: starts with letter or underscore,
// followed by alphanumeric or underscore, max 64 chars (MySQL limit)
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

/**
 * Validates a SQL identifier (table name, column name, index name).
 * Throws if the identifier contains unsafe characters.
 */
export function validateIdentifier(name: string): string {
  if (!name || !IDENTIFIER_REGEX.test(name)) {
    throw new Error(
      `Invalid SQL identifier: "${name}". Must match [a-zA-Z_][a-zA-Z0-9_]{0,63}`
    );
  }
  return name;
}

/**
 * Validates an array of SQL identifiers.
 * Throws if the array is empty or any identifier is invalid.
 */
export function validateIdentifiers(names: string[]): string[] {
  if (!names || names.length === 0) {
    throw new Error('At least one identifier required');
  }
  return names.map(validateIdentifier);
}
