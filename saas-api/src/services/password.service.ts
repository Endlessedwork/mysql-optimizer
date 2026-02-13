import bcrypt from 'bcryptjs';

/**
 * Password strength requirements
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export class PasswordService {
  private readonly bcryptRounds: number;

  constructor(bcryptRounds: number = 12) {
    this.bcryptRounds = bcryptRounds;
  }

  /**
   * Hash password using bcrypt
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Verify password against hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate password strength
   */
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }

    if (!PASSWORD_REGEX.uppercase.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!PASSWORD_REGEX.lowercase.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!PASSWORD_REGEX.number.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Special character is optional but recommended
    // Uncomment to make it required:
    // if (!PASSWORD_REGEX.special.test(password)) {
    //   errors.push('Password must contain at least one special character');
    // }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate random password
   */
  generateRandom(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one of each required type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Check if password is in common passwords list (placeholder)
   * In production, implement checking against a real blacklist
   */
  isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password',
      'Password1',
      '12345678',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }
}

// Singleton instance
export const passwordService = new PasswordService(
  parseInt(process.env.BCRYPT_ROUNDS || '12')
);
