import { Pool, PoolClient } from 'pg';

export type UserRole = 'super_admin' | 'admin' | 'dba' | 'developer' | 'viewer';
export type UserStatus = 'active' | 'disabled' | 'locked' | 'pending';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  googleId: string | null;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateUserInput {
  tenantId: string;
  email: string;
  passwordHash?: string;
  fullName: string;
  role: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  createdBy?: string;
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
  avatarUrl?: string | null;
  googleId?: string | null;
  emailVerified?: boolean;
}

export interface UserFilters {
  tenantId?: string;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: 'email' | 'fullName' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UsersModel {
  constructor(private pool: Pool) {}

  /**
   * Find user by ID
   */
  async findById(userId: string, client?: PoolClient): Promise<User | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, tenant_id as "tenantId", email, password_hash as "passwordHash",
        full_name as "fullName", role, status, avatar_url as "avatarUrl",
        google_id as "googleId", google_access_token as "googleAccessToken",
        google_refresh_token as "googleRefreshToken",
        last_login_at as "lastLoginAt", last_login_ip as "lastLoginIp",
        failed_login_attempts as "failedLoginAttempts",
        locked_until as "lockedUntil", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt",
        created_by as "createdBy"
       FROM users
       WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string, client?: PoolClient): Promise<User | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, tenant_id as "tenantId", email, password_hash as "passwordHash",
        full_name as "fullName", role, status, avatar_url as "avatarUrl",
        google_id as "googleId", google_access_token as "googleAccessToken",
        google_refresh_token as "googleRefreshToken",
        last_login_at as "lastLoginAt", last_login_ip as "lastLoginIp",
        failed_login_attempts as "failedLoginAttempts",
        locked_until as "lockedUntil", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt",
        created_by as "createdBy"
       FROM users
       WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string, client?: PoolClient): Promise<User | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, tenant_id as "tenantId", email, password_hash as "passwordHash",
        full_name as "fullName", role, status, avatar_url as "avatarUrl",
        google_id as "googleId", google_access_token as "googleAccessToken",
        google_refresh_token as "googleRefreshToken",
        last_login_at as "lastLoginAt", last_login_ip as "lastLoginIp",
        failed_login_attempts as "failedLoginAttempts",
        locked_until as "lockedUntil", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt",
        created_by as "createdBy"
       FROM users
       WHERE google_id = $1`,
      [googleId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  async create(input: CreateUserInput, client?: PoolClient): Promise<User> {
    const db = client || this.pool;
    const result = await db.query(
      `INSERT INTO users (
        tenant_id, email, password_hash, full_name, role, status,
        email_verified, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id, tenant_id as "tenantId", email, password_hash as "passwordHash",
        full_name as "fullName", role, status, avatar_url as "avatarUrl",
        google_id as "googleId", google_access_token as "googleAccessToken",
        google_refresh_token as "googleRefreshToken",
        last_login_at as "lastLoginAt", last_login_ip as "lastLoginIp",
        failed_login_attempts as "failedLoginAttempts",
        locked_until as "lockedUntil", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt",
        created_by as "createdBy"`,
      [
        input.tenantId,
        input.email,
        input.passwordHash || null,
        input.fullName,
        input.role,
        input.status || 'active',
        input.emailVerified ?? false,
        input.createdBy || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update user
   */
  async update(
    userId: string,
    input: UpdateUserInput,
    client?: PoolClient
  ): Promise<User | null> {
    const db = client || this.pool;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(input.email);
    }
    if (input.passwordHash !== undefined) {
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(input.passwordHash);
    }
    if (input.fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(input.fullName);
    }
    if (input.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(input.role);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(input.avatarUrl);
    }
    if (input.googleId !== undefined) {
      updates.push(`google_id = $${paramIndex++}`);
      values.push(input.googleId);
    }
    if (input.emailVerified !== undefined) {
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(input.emailVerified);
    }

    if (updates.length === 0) {
      return this.findById(userId, client);
    }

    values.push(userId);

    const result = await db.query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING
        id, tenant_id as "tenantId", email, password_hash as "passwordHash",
        full_name as "fullName", role, status, avatar_url as "avatarUrl",
        google_id as "googleId", google_access_token as "googleAccessToken",
        google_refresh_token as "googleRefreshToken",
        last_login_at as "lastLoginAt", last_login_ip as "lastLoginIp",
        failed_login_attempts as "failedLoginAttempts",
        locked_until as "lockedUntil", email_verified as "emailVerified",
        created_at as "createdAt", updated_at as "updatedAt",
        created_by as "createdBy"`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update login tracking
   */
  async updateLoginTracking(
    userId: string,
    ip: string,
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP,
           last_login_ip = $2,
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = $1`,
      [userId, ip]
    );
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedAttempts(userId: string, client?: PoolClient): Promise<number> {
    const db = client || this.pool;
    const result = await db.query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1
       WHERE id = $1
       RETURNING failed_login_attempts as "failedLoginAttempts"`,
      [userId]
    );

    return result.rows[0]?.failedLoginAttempts || 0;
  }

  /**
   * Lock user account
   */
  async lockAccount(
    userId: string,
    durationMinutes: number = 30,
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE users
       SET locked_until = CURRENT_TIMESTAMP + $2::integer * INTERVAL '1 minute',
           status = 'locked'
       WHERE id = $1`,
      [userId, durationMinutes]
    );
  }

  /**
   * Unlock user account
   */
  async unlockAccount(userId: string, client?: PoolClient): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE users
       SET locked_until = NULL,
           failed_login_attempts = 0,
           status = 'active'
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * List users with pagination and filters
   */
  async list(
    filters: UserFilters,
    pagination: PaginationParams,
    client?: PoolClient
  ): Promise<PaginatedUsers> {
    const db = client || this.pool;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.tenantId) {
      conditions.push(`u.tenant_id = $${paramIndex++}`);
      values.push(filters.tenantId);
    }
    if (filters.role) {
      conditions.push(`u.role = $${paramIndex++}`);
      values.push(filters.role);
    }
    if (filters.status) {
      conditions.push(`u.status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.search) {
      conditions.push(
        `(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`
      );
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const sortBy = pagination.sortBy || 'createdAt';
    const sortOrder = pagination.sortOrder || 'desc';
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * limit;

    const sortColumn = {
      email: 'u.email',
      fullName: 'u.full_name',
      createdAt: 'u.created_at',
      lastLoginAt: 'u.last_login_at',
    }[sortBy];

    const result = await db.query(
      `SELECT
        u.id, u.tenant_id as "tenantId", u.email, u.full_name as "fullName",
        u.role, u.status, u.avatar_url as "avatarUrl",
        u.last_login_at as "lastLoginAt", u.created_at as "createdAt",
        t.name as "tenantName"
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      users: result.rows,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete user
   */
  async delete(userId: string, client?: PoolClient): Promise<boolean> {
    const db = client || this.pool;
    const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if user is account owner or has permission
   */
  async canAccessUser(
    requestingUserId: string,
    targetUserId: string,
    client?: PoolClient
  ): Promise<boolean> {
    // Self access always allowed
    if (requestingUserId === targetUserId) {
      return true;
    }

    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        (u1.role IN ('super_admin', 'admin') OR u1.id = u2.id) as can_access
       FROM users u1
       LEFT JOIN users u2 ON u2.id = $2
       WHERE u1.id = $1`,
      [requestingUserId, targetUserId]
    );

    return result.rows[0]?.can_access || false;
  }
}
