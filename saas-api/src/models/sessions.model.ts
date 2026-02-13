import { Pool, PoolClient } from 'pg';

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
}

export interface UserSession {
  id: string;
  userId: string;
  accessTokenJti: string;
  refreshTokenId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  deviceName: string | null;
  location: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionInput {
  userId: string;
  accessTokenJti: string;
  refreshTokenId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceName?: string;
  location?: string;
  expiresAt: Date;
}

export class SessionsModel {
  constructor(private pool: Pool) {}

  /**
   * Create refresh token
   */
  async createRefreshToken(
    input: CreateRefreshTokenInput,
    client?: PoolClient
  ): Promise<RefreshToken> {
    const db = client || this.pool;
    const result = await db.query(
      `INSERT INTO refresh_tokens (
        user_id, token_hash, expires_at, device_info, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id, user_id as "userId", token_hash as "tokenHash",
        expires_at as "expiresAt", device_info as "deviceInfo",
        ip_address as "ipAddress", user_agent as "userAgent",
        created_at as "createdAt", revoked_at as "revokedAt",
        revoked_by as "revokedBy"`,
      [
        input.userId,
        input.tokenHash,
        input.expiresAt,
        input.deviceInfo || null,
        input.ipAddress || null,
        input.userAgent || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Find refresh token by hash
   */
  async findRefreshToken(tokenHash: string, client?: PoolClient): Promise<RefreshToken | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, user_id as "userId", token_hash as "tokenHash",
        expires_at as "expiresAt", device_info as "deviceInfo",
        ip_address as "ipAddress", user_agent as "userAgent",
        created_at as "createdAt", revoked_at as "revokedAt",
        revoked_by as "revokedBy"
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    return result.rows[0] || null;
  }

  /**
   * Validate refresh token (not expired, not revoked)
   */
  async validateRefreshToken(tokenHash: string, client?: PoolClient): Promise<RefreshToken | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, user_id as "userId", token_hash as "tokenHash",
        expires_at as "expiresAt", device_info as "deviceInfo",
        ip_address as "ipAddress", user_agent as "userAgent",
        created_at as "createdAt", revoked_at as "revokedAt",
        revoked_by as "revokedBy"
       FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    return result.rows[0] || null;
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(
    tokenHash: string,
    revokedBy?: string,
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP,
           revoked_by = $2
       WHERE token_hash = $1`,
      [tokenHash, revokedBy || null]
    );
  }

  /**
   * Create user session
   */
  async createSession(input: CreateSessionInput, client?: PoolClient): Promise<UserSession> {
    const db = client || this.pool;
    const result = await db.query(
      `INSERT INTO user_sessions (
        user_id, access_token_jti, refresh_token_id,
        ip_address, user_agent, device_type, device_name, location,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id, user_id as "userId", access_token_jti as "accessTokenJti",
        refresh_token_id as "refreshTokenId",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_type as "deviceType", device_name as "deviceName",
        location as "location",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", revoked_at as "revokedAt",
        revoked_by as "revokedBy"`,
      [
        input.userId,
        input.accessTokenJti,
        input.refreshTokenId || null,
        input.ipAddress || null,
        input.userAgent || null,
        input.deviceType || null,
        input.deviceName || null,
        input.location || null,
        input.expiresAt,
      ]
    );

    return result.rows[0];
  }

  /**
   * Find session by JWT ID
   */
  async findSessionByJti(jti: string, client?: PoolClient): Promise<UserSession | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, user_id as "userId", access_token_jti as "accessTokenJti",
        refresh_token_id as "refreshTokenId",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_type as "deviceType", device_name as "deviceName",
        location as "location",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", revoked_at as "revokedAt",
        revoked_by as "revokedBy"
       FROM user_sessions
       WHERE access_token_jti = $1`,
      [jti]
    );

    return result.rows[0] || null;
  }

  /**
   * Validate session (not expired, not revoked)
   */
  async validateSession(jti: string, client?: PoolClient): Promise<UserSession | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, user_id as "userId", access_token_jti as "accessTokenJti",
        refresh_token_id as "refreshTokenId",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_type as "deviceType", device_name as "deviceName",
        location as "location",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", revoked_at as "revokedAt",
        revoked_by as "revokedBy"
       FROM user_sessions
       WHERE access_token_jti = $1
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
      [jti]
    );

    return result.rows[0] || null;
  }

  /**
   * Update session last activity
   */
  async updateActivity(jti: string, client?: PoolClient): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE user_sessions
       SET last_activity_at = CURRENT_TIMESTAMP
       WHERE access_token_jti = $1`,
      [jti]
    );
  }

  /**
   * Revoke session
   */
  async revokeSession(jti: string, revokedBy?: string, client?: PoolClient): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE user_sessions
       SET revoked_at = CURRENT_TIMESTAMP,
           revoked_by = $2
       WHERE access_token_jti = $1`,
      [jti, revokedBy || null]
    );
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string, client?: PoolClient): Promise<UserSession[]> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, user_id as "userId", access_token_jti as "accessTokenJti",
        refresh_token_id as "refreshTokenId",
        ip_address as "ipAddress", user_agent as "userAgent",
        device_type as "deviceType", device_name as "deviceName",
        location as "location",
        created_at as "createdAt", last_activity_at as "lastActivityAt",
        expires_at as "expiresAt", revoked_at as "revokedAt",
        revoked_by as "revokedBy"
       FROM user_sessions
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY last_activity_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Revoke all sessions for user except current
   */
  async revokeAllUserSessions(
    userId: string,
    exceptJti?: string,
    revokedBy?: string,
    client?: PoolClient
  ): Promise<number> {
    const db = client || this.pool;
    const conditions = ['user_id = $1', 'revoked_at IS NULL'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (exceptJti) {
      conditions.push(`access_token_jti != $${paramIndex++}`);
      values.push(exceptJti);
    }

    values.push(revokedBy || null);

    const result = await db.query(
      `UPDATE user_sessions
       SET revoked_at = CURRENT_TIMESTAMP,
           revoked_by = $${paramIndex}
       WHERE ${conditions.join(' AND ')}`,
      values
    );

    return result.rowCount ?? 0;
  }

  /**
   * Clean up expired tokens and sessions
   */
  async cleanupExpired(client?: PoolClient): Promise<{ tokens: number; sessions: number }> {
    const db = client || this.pool;

    // Delete expired refresh tokens (older than 7 days)
    const tokensResult = await db.query(
      `DELETE FROM refresh_tokens
       WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days'`
    );

    // Delete expired sessions (older than 7 days)
    const sessionsResult = await db.query(
      `DELETE FROM user_sessions
       WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days'`
    );

    return {
      tokens: tokensResult.rowCount ?? 0,
      sessions: sessionsResult.rowCount ?? 0,
    };
  }
}
