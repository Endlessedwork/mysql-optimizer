import { FastifyJWT } from '@fastify/jwt';
import crypto from 'crypto';
import { UserRole } from '../models/users.model';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
  sessionId?: string;
}

export interface GenerateTokensResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  expiresIn: number;
  jti: string; // Access token JTI for session tracking
}

export class TokenService {
  private jwtSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.accessTokenExpiry = process.env.JWT_ACCESS_TOKEN_EXPIRY || '8h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d';

    if (!this.jwtSecret || this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(
    payload: TokenPayload,
    jwt: FastifyJWT,
    rememberMe: boolean = false
  ): Promise<GenerateTokensResult> {
    // Generate unique JTI for access token
    const jti = this.generateJti();

    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
        sessionId: payload.sessionId,
      },
      {
        jti,
        expiresIn: this.accessTokenExpiry,
      }
    );

    // Generate refresh token (random string)
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);

    // Calculate expiry in seconds
    const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
      expiresIn,
      jti, // Return JTI for session tracking
    };
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string, jwt: FastifyJWT): TokenPayload & { jti: string } {
    try {
      const decoded = jwt.verify(token) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId,
        sessionId: decoded.sessionId,
        jti: decoded.jti,
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate unique JWT ID
   */
  generateJti(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token using SHA-256
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate password reset token
   */
  generateResetToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    return { token, hash };
  }

  /**
   * Generate email verification token
   */
  generateVerificationToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    return { token, hash };
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 28800; // Default 8 hours
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 28800;
    }
  }

  /**
   * Get refresh token expiry date
   */
  getRefreshTokenExpiry(rememberMe: boolean = false): Date {
    const expiry = rememberMe ? '90d' : this.refreshTokenExpiry;
    const seconds = this.parseExpiryToSeconds(expiry);
    return new Date(Date.now() + seconds * 1000);
  }

  /**
   * Get password reset token expiry (1 hour)
   */
  getResetTokenExpiry(): Date {
    return new Date(Date.now() + 3600 * 1000);
  }

  /**
   * Get email verification token expiry (24 hours)
   */
  getVerificationTokenExpiry(): Date {
    return new Date(Date.now() + 86400 * 1000);
  }
}

// Singleton instance
export const tokenService = new TokenService();
