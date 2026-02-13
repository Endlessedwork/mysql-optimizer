import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

/**
 * Seeds the initial super admin user
 * This function is idempotent - safe to run multiple times
 */
export async function seedInitialAdmin(
  pool: Pool,
  config?: Partial<SeedConfig>
): Promise<void> {
  const adminEmail = config?.adminEmail || process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = config?.adminPassword || process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const adminName = config?.adminName || process.env.ADMIN_NAME || 'System Administrator';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if admin already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      console.log(`✓ Admin user already exists: ${adminEmail}`);
      await client.query('ROLLBACK');
      return;
    }

    // Get or create default tenant
    let tenantResult = await client.query(
      'SELECT id FROM tenants ORDER BY created_at LIMIT 1'
    );

    let tenantId: string;

    if (tenantResult.rows.length === 0) {
      tenantId = uuidv4();
      await client.query(
        `INSERT INTO tenants (id, name, allow_google_sso, created_at, updated_at)
         VALUES ($1, $2, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [tenantId, 'Default Tenant']
      );
      console.log(`✓ Created default tenant: ${tenantId}`);
    } else {
      tenantId = tenantResult.rows[0].id;
    }

    // Hash password with bcrypt (work factor 12)
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (
        id, tenant_id, email, password_hash, full_name,
        role, status, email_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'super_admin', 'active', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, tenantId, adminEmail, passwordHash, adminName]
    );

    await client.query('COMMIT');

    console.log('='.repeat(60));
    console.log('✓ Initial Super Admin Created:');
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  User ID:  ${userId}`);
    console.log('='.repeat(60));
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to seed initial admin:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * CLI runner for seeding initial admin
 * Usage: npx ts-node src/seeds/initial-admin.ts
 */
if (require.main === module) {
  (async () => {
    const { pool } = await import('../database');

    try {
      await seedInitialAdmin(pool);
      console.log('✓ Seed completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    }
  })();
}
