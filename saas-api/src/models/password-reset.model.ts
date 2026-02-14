import { Pool, PoolClient } from 'pg';

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface CreatePasswordResetInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
}

export class PasswordResetModel {
  constructor(private pool: Pool) {}

  /**
   * Create a new password reset token
   */
  async create(
    input: CreatePasswordResetInput,
    client?: PoolClient
  ): Promise<PasswordResetToken> {
    const db = client || this.pool;
    const result = await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.userId, input.tokenHash, input.expiresAt, input.ipAddress || null]
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Find a valid (not expired, not used) token by hash
   */
  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const result = await this.pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
         AND used_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Mark a token as used
   */
  async markAsUsed(tokenHash: string, client?: PoolClient): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  /**
   * Invalidate all pending tokens for a user (mark as used)
   */
  async invalidateAllForUser(
    userId: string,
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = $1
         AND used_at IS NULL`,
      [userId]
    );
  }

  private mapRow(row: any): PasswordResetToken {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    };
  }
}
