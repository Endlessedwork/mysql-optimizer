import { Pool, PoolClient } from 'pg';

export interface Tenant {
  id: string;
  name: string;
  allowGoogleSso: boolean;
  allowedGoogleDomains: string | null;
  requireEmailVerification: boolean;
  sessionTimeoutHours: number;
  maxConcurrentSessions: number;
  allowSelfRegistration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  name: string;
  allowGoogleSso?: boolean;
  allowSelfRegistration?: boolean;
}

export class TenantsModel {
  constructor(private pool: Pool) {}

  async create(input: CreateTenantInput, client?: PoolClient): Promise<Tenant> {
    const db = client || this.pool;
    const result = await db.query(
      `INSERT INTO tenants (name, allow_google_sso, allow_self_registration)
       VALUES ($1, $2, $3)
       RETURNING
        id, name,
        allow_google_sso AS "allowGoogleSso",
        allowed_google_domains AS "allowedGoogleDomains",
        require_email_verification AS "requireEmailVerification",
        session_timeout_hours AS "sessionTimeoutHours",
        max_concurrent_sessions AS "maxConcurrentSessions",
        allow_self_registration AS "allowSelfRegistration",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [
        input.name,
        input.allowGoogleSso ?? true,
        input.allowSelfRegistration ?? true,
      ]
    );

    return result.rows[0];
  }

  async findById(id: string, client?: PoolClient): Promise<Tenant | null> {
    const db = client || this.pool;
    const result = await db.query(
      `SELECT
        id, name,
        allow_google_sso AS "allowGoogleSso",
        allowed_google_domains AS "allowedGoogleDomains",
        require_email_verification AS "requireEmailVerification",
        session_timeout_hours AS "sessionTimeoutHours",
        max_concurrent_sessions AS "maxConcurrentSessions",
        allow_self_registration AS "allowSelfRegistration",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
       FROM tenants
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
}
