-- Migration: 003_add_auth_system
-- Description: Add multi-user authentication tables and modify existing tables
-- Author: System Architect
-- Date: 2026-02-12

-- ============================================================
-- 1. UPDATE TENANTS TABLE
-- ============================================================

-- Add authentication settings to existing tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS allow_google_sso BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allowed_google_domains TEXT,
ADD COLUMN IF NOT EXISTS require_email_verification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_timeout_hours INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS allow_self_registration BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN tenants.allow_google_sso IS 'Enable Google OAuth for this tenant';
COMMENT ON COLUMN tenants.allowed_google_domains IS 'JSON array of allowed Google Workspace domains';
COMMENT ON COLUMN tenants.require_email_verification IS 'Require email verification before login';
COMMENT ON COLUMN tenants.session_timeout_hours IS 'Access token expiration in hours';
COMMENT ON COLUMN tenants.max_concurrent_sessions IS 'Maximum concurrent sessions per user (0 = unlimited)';
COMMENT ON COLUMN tenants.allow_self_registration IS 'Allow users to self-register';

-- ============================================================
-- 2. CREATE USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenant association
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Core identity
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,

    -- Role and status
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    status VARCHAR(50) NOT NULL DEFAULT 'active',

    -- Profile
    avatar_url TEXT,

    -- Google OAuth fields
    google_id VARCHAR(255),
    google_access_token TEXT,
    google_refresh_token TEXT,

    -- Login tracking
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,

    -- Email verification
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Audit
    created_by UUID,

    -- Constraints
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_google_id_unique UNIQUE (google_id),
    CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'dba', 'developer', 'viewer')),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled', 'locked', 'pending'))
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id, status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN users.role IS 'User role: super_admin, admin, dba, developer, viewer';
COMMENT ON COLUMN users.status IS 'Account status: active, disabled, locked, pending';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash of password, NULL for SSO-only users';

-- ============================================================
-- 3. CREATE REFRESH_TOKENS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User association
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token (hashed)
    token_hash VARCHAR(255) NOT NULL,

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Device info
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Revocation
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

-- Indexes for refresh_tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON refresh_tokens(user_id)
    WHERE revoked_at IS NULL;

COMMENT ON TABLE refresh_tokens IS 'Refresh tokens for JWT token rotation';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token';

-- ============================================================
-- 4. CREATE USER_SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User association
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token tracking
    access_token_jti VARCHAR(255) NOT NULL,
    refresh_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,

    -- Device/location info
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    device_name VARCHAR(100),
    location VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Revocation
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT user_sessions_jti_unique UNIQUE (access_token_jti)
);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON user_sessions(access_token_jti);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token_id)
    WHERE refresh_token_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id)
    WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity_at);

COMMENT ON TABLE user_sessions IS 'Active user sessions for session management and revocation';
COMMENT ON COLUMN user_sessions.access_token_jti IS 'JWT ID claim for token tracking';

-- ============================================================
-- 5. CREATE PASSWORD_RESET_TOKENS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User association
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token (hashed)
    token_hash VARCHAR(255) NOT NULL,

    -- Expiration (typically 1 hour)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Usage tracking
    used_at TIMESTAMP WITH TIME ZONE,

    -- Request info
    ip_address VARCHAR(45),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT password_reset_tokens_hash_unique UNIQUE (token_hash)
);

-- Indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)
    WHERE used_at IS NULL;

COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens sent via email';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token';

-- ============================================================
-- 6. CREATE EMAIL_VERIFICATION_TOKENS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User association
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token (hashed)
    token_hash VARCHAR(255) NOT NULL,

    -- Expiration (typically 24 hours)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Usage tracking
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT email_verification_tokens_hash_unique UNIQUE (token_hash)
);

-- Indexes for email_verification_tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at)
    WHERE verified_at IS NULL;

COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens for new accounts';

-- ============================================================
-- 7. UPDATE AUDIT_LOGS TABLE
-- ============================================================

-- Add new columns to existing audit_logs table
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE;

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_audit_logs_user'
        AND table_name = 'audit_logs'
    ) THEN
        ALTER TABLE audit_logs
        ADD CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);

COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the request';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string from request headers';
COMMENT ON COLUMN audit_logs.success IS 'Whether the action was successful';

-- ============================================================
-- 8. CREATE TOKEN_BLACKLIST TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Token identifier
    token_jti VARCHAR(255) NOT NULL,

    -- Reason for blacklisting
    reason VARCHAR(100),

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT token_blacklist_jti_unique UNIQUE (token_jti)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);

COMMENT ON TABLE token_blacklist IS 'Blacklisted JWT tokens for immediate revocation';

-- ============================================================
-- 9. CREATE RATE_LIMITS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifier (IP or user email)
    identifier VARCHAR(255) NOT NULL,

    -- Endpoint/action being rate limited
    action VARCHAR(100) NOT NULL,

    -- Request count
    request_count INTEGER NOT NULL DEFAULT 1,

    -- Window start
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT rate_limits_identifier_action_unique UNIQUE (identifier, action)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

COMMENT ON TABLE rate_limits IS 'Rate limiting counters (alternative to Redis)';

-- ============================================================
-- 10. ADD SELF-REFERENCE TO USERS TABLE
-- ============================================================

-- Add foreign key for created_by after users table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_created_by'
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Verify tables exist
DO $$
DECLARE
    tbl_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tbl_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('users', 'refresh_tokens', 'user_sessions',
                       'password_reset_tokens', 'email_verification_tokens',
                       'token_blacklist', 'rate_limits');

    IF tbl_count < 7 THEN
        RAISE EXCEPTION 'Migration incomplete: Expected 7 tables, found %', tbl_count;
    END IF;

    RAISE NOTICE 'Migration 003_add_auth_system completed successfully';
END $$;
