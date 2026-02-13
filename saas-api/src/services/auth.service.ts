import { Pool } from 'pg';
import { FastifyInstance } from 'fastify';
import { UsersModel, User, UserRole } from '../models/users.model';

// Type for Fastify JWT instance
type JWTInstance = FastifyInstance['jwt'];
import { SessionsModel, UserSession, RefreshToken } from '../models/sessions.model';
import { passwordService } from './password.service';
import { tokenService, TokenPayload } from './token.service';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    tenantId: string;
    avatarUrl: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
}

export class AuthService {
  private usersModel: UsersModel;
  private sessionsModel: SessionsModel;
  private maxFailedAttempts: number;
  private lockoutDurationMinutes: number;

  constructor(private pool: Pool) {
    this.usersModel = new UsersModel(pool);
    this.sessionsModel = new SessionsModel(pool);
    this.maxFailedAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS || '10');
    this.lockoutDurationMinutes = parseInt(
      process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || '30'
    );
  }

  /**
   * Login with email and password
   */
  async login(
    credentials: LoginCredentials,
    jwt: JWTInstance,
    ipAddress: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const { email, password, rememberMe } = credentials;

    // Find user by email
    const user = await this.usersModel.findByEmail(email);
    if (!user) {
      throw new Error('AUTH_001: Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error(
        `AUTH_002: Account locked until ${new Date(user.lockedUntil).toISOString()}`
      );
    }

    // Check if account is disabled
    if (user.status === 'disabled') {
      throw new Error('AUTH_007: Account has been disabled');
    }

    // Check if password is set (not SSO-only user)
    if (!user.passwordHash) {
      throw new Error('AUTH_001: Invalid email or password');
    }

    // Verify password
    const isValidPassword = await passwordService.verify(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = await this.usersModel.incrementFailedAttempts(user.id);

      // Lock account if max attempts exceeded
      if (failedAttempts >= this.maxFailedAttempts) {
        await this.usersModel.lockAccount(user.id, this.lockoutDurationMinutes);
        throw new Error('AUTH_002: Account locked due to too many failed login attempts');
      }

      throw new Error('AUTH_001: Invalid email or password');
    }

    // Check email verification if required
    // Note: Implement tenant settings check here if needed
    // if (tenant.requireEmailVerification && !user.emailVerified) {
    //   throw new Error('AUTH_003: Email not verified');
    // }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const tokens = await tokenService.generateTokens(tokenPayload, jwt, rememberMe);

    // Create session in transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Store refresh token
      const refreshTokenExpiry = tokenService.getRefreshTokenExpiry(rememberMe);
      const refreshToken = await this.sessionsModel.createRefreshToken(
        {
          userId: user.id,
          tokenHash: tokens.refreshTokenHash,
          expiresAt: refreshTokenExpiry,
          ipAddress,
          userAgent,
        },
        client
      );

      // Create session using JTI from generated token
      const accessTokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
      await this.sessionsModel.createSession(
        {
          userId: user.id,
          accessTokenJti: tokens.jti, // Use JTI from generated token
          refreshTokenId: refreshToken.id,
          ipAddress,
          userAgent,
          expiresAt: accessTokenExpiry,
        },
        client
      );

      // Update login tracking
      await this.usersModel.updateLoginTracking(user.id, ipAddress, client);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
        avatarUrl: user.avatarUrl,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Logout - revoke session and tokens
   */
  async logout(userId: string, jti: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get session
      const session = await this.sessionsModel.findSessionByJti(jti, client);
      if (session) {
        // Revoke session
        await this.sessionsModel.revokeSession(jti, userId, client);

        // Revoke associated refresh token if exists
        if (session.refreshTokenId) {
          const refreshToken = await client.query(
            'SELECT token_hash FROM refresh_tokens WHERE id = $1',
            [session.refreshTokenId]
          );
          if (refreshToken.rows[0]) {
            await this.sessionsModel.revokeRefreshToken(
              refreshToken.rows[0].token_hash,
              userId,
              client
            );
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshTokenString: string,
    jwt: JWTInstance
  ): Promise<RefreshResult> {
    const tokenHash = tokenService.hashToken(refreshTokenString);

    // Validate refresh token
    const refreshToken = await this.sessionsModel.validateRefreshToken(tokenHash);
    if (!refreshToken) {
      throw new Error('AUTH_004: Refresh token expired or invalid');
    }

    // Get user
    const user = await this.usersModel.findById(refreshToken.userId);
    if (!user) {
      throw new Error('AUTH_005: User not found');
    }

    // Check account status
    if (user.status !== 'active') {
      throw new Error('AUTH_007: Account not active');
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new Error('AUTH_002: Account is locked');
    }

    // Token rotation: revoke old refresh token and create new one
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Revoke old refresh token
      await this.sessionsModel.revokeRefreshToken(tokenHash, user.id, client);

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };

      const newTokens = await tokenService.generateTokens(tokenPayload, jwt, false);

      // Store new refresh token
      const newRefreshTokenExpiry = tokenService.getRefreshTokenExpiry(false);
      await this.sessionsModel.createRefreshToken(
        {
          userId: user.id,
          tokenHash: newTokens.refreshTokenHash,
          expiresAt: newRefreshTokenExpiry,
        },
        client
      );

      await client.query('COMMIT');

      return {
        accessToken: newTokens.accessToken,
        expiresIn: newTokens.expiresIn,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate session
   */
  async validateSession(jti: string): Promise<User | null> {
    const session = await this.sessionsModel.validateSession(jti);
    if (!session) {
      return null;
    }

    // Update last activity
    await this.sessionsModel.updateActivity(jti);

    // Get user
    return this.usersModel.findById(session.userId);
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return this.sessionsModel.getUserSessions(userId);
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(
    userId: string,
    currentJti: string
  ): Promise<number> {
    return this.sessionsModel.revokeAllUserSessions(userId, currentJti, userId);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const user = await this.usersModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    if (user.passwordHash) {
      const isValid = await passwordService.verify(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
    }

    // Validate new password
    const validation = passwordService.validate(newPassword);
    if (!validation.valid) {
      throw new Error(`AUTH_008: ${validation.errors.join(', ')}`);
    }

    // Hash new password
    const newPasswordHash = await passwordService.hash(newPassword);

    // Update password
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await this.usersModel.update(
        userId,
        { passwordHash: newPasswordHash },
        client
      );

      // Revoke all other sessions for security
      await this.sessionsModel.revokeAllUserSessions(userId, undefined, userId, client);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Unlock user account (admin action)
   */
  async unlockAccount(userId: string): Promise<void> {
    await this.usersModel.unlockAccount(userId);
  }
}
