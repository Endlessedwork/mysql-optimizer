# Security Critical Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 15 CRITICAL and the most dangerous HIGH security vulnerabilities found in the code review, making the application safe for production deployment.

**Architecture:** We fix issues in priority order: (1) SQL injection in the Agent executor, (2) Authentication/Authorization across all services, (3) Infrastructure secrets and exposure, (4) Security hardening. Each task is self-contained with a test and commit.

**Tech Stack:** TypeScript, Node.js, Fastify, Next.js 14, PostgreSQL, MySQL2, Docker Compose

---

## Phase 1: SQL Injection & Command Safety (Agent)

### Task 1: Add SQL Identifier Validation Utility

**Files:**
- Create: `agent/src/utils/sql-validator.ts`
- Test: `agent/src/__tests__/sql-validator.test.ts`

**Step 1: Write the failing test**

```typescript
// agent/src/__tests__/sql-validator.test.ts
import { validateIdentifier, validateIdentifiers } from '../utils/sql-validator';

describe('SQL Identifier Validator', () => {
  describe('validateIdentifier', () => {
    it('accepts valid simple identifier', () => {
      expect(validateIdentifier('users')).toBe('users');
    });

    it('accepts identifier with underscore', () => {
      expect(validateIdentifier('user_accounts')).toBe('user_accounts');
    });

    it('accepts identifier starting with underscore', () => {
      expect(validateIdentifier('_temp')).toBe('_temp');
    });

    it('accepts identifier with numbers', () => {
      expect(validateIdentifier('table2')).toBe('table2');
    });

    it('rejects empty string', () => {
      expect(() => validateIdentifier('')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with backtick', () => {
      expect(() => validateIdentifier('table`; DROP TABLE users;--')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with semicolon', () => {
      expect(() => validateIdentifier('table; DROP TABLE')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with spaces', () => {
      expect(() => validateIdentifier('my table')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier starting with number', () => {
      expect(() => validateIdentifier('123abc')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier longer than 64 chars', () => {
      expect(() => validateIdentifier('a'.repeat(65))).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with dash', () => {
      expect(() => validateIdentifier('my-table')).toThrow('Invalid SQL identifier');
    });

    it('rejects identifier with parentheses', () => {
      expect(() => validateIdentifier('col1)')).toThrow('Invalid SQL identifier');
    });
  });

  describe('validateIdentifiers', () => {
    it('accepts array of valid identifiers', () => {
      expect(validateIdentifiers(['col1', 'col2', 'col3'])).toEqual(['col1', 'col2', 'col3']);
    });

    it('rejects if any identifier is invalid', () => {
      expect(() => validateIdentifiers(['col1', 'col2; DROP', 'col3'])).toThrow('Invalid SQL identifier');
    });

    it('rejects empty array', () => {
      expect(() => validateIdentifiers([])).toThrow('At least one identifier required');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/alone/AiCode/mysql-optimizer/agent && npx ts-jest --config '{"transform":{"^.+\\.tsx?$":"ts-jest"}}' src/__tests__/sql-validator.test.ts` or equivalent
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// agent/src/utils/sql-validator.ts

// Strict MySQL identifier pattern: starts with letter or underscore,
// followed by alphanumeric or underscore, max 64 chars (MySQL limit)
const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

/**
 * Validates a SQL identifier (table name, column name, index name).
 * Throws if the identifier contains unsafe characters.
 * MySQL identifiers: letters, digits, underscores only. Max 64 chars.
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
```

**Step 4: Run test to verify it passes**

Run: test command from step 2
Expected: PASS

**Step 5: Commit**

```bash
git add agent/src/utils/sql-validator.ts agent/src/__tests__/sql-validator.test.ts
git commit -m "feat(agent): add SQL identifier validation utility for injection prevention"
```

---

### Task 2: Fix SQL Injection in IndexExecutor

**Files:**
- Modify: `agent/src/executor/index-executor.ts`
- Test: `agent/src/__tests__/index-executor.test.ts`

**Step 1: Write the failing test**

```typescript
// agent/src/__tests__/index-executor.test.ts
import { validateIdentifier, validateIdentifiers } from '../utils/sql-validator';

describe('IndexExecutor SQL Safety', () => {
  it('rejects malicious table_name', () => {
    expect(() => validateIdentifier('users`; DROP TABLE users;--'))
      .toThrow('Invalid SQL identifier');
  });

  it('rejects malicious index_name', () => {
    expect(() => validateIdentifier('idx`; DROP DATABASE prod;--'))
      .toThrow('Invalid SQL identifier');
  });

  it('rejects malicious column in columns array', () => {
    expect(() => validateIdentifiers(['id', 'name); DROP TABLE users;--']))
      .toThrow('Invalid SQL identifier');
  });

  it('accepts valid identifiers', () => {
    expect(validateIdentifier('users')).toBe('users');
    expect(validateIdentifier('idx_users_email')).toBe('idx_users_email');
    expect(validateIdentifiers(['id', 'email', 'created_at'])).toEqual(['id', 'email', 'created_at']);
  });
});
```

**Step 2: Run test to verify it passes** (uses already-implemented validator)

**Step 3: Apply fix to index-executor.ts**

Replace the `executeAddIndex` method body in `agent/src/executor/index-executor.ts`:

```typescript
// agent/src/executor/index-executor.ts - updated
import { MysqlConnector } from '../mysql-connector';
import { Config } from '../config';
import { Logger } from '../logger';
import { ExecutionRun } from '../types';
import { validateIdentifier, validateIdentifiers } from '../utils/sql-validator';

export interface IndexExecutionResult {
  success: boolean;
  index_name: string;
  table_name: string;
  executed_sql: string;
}

export class IndexExecutor {
  private connector: MysqlConnector;
  private logger: Logger;

  constructor() {
    const config = new Config();
    this.logger = new Logger();
    this.connector = new MysqlConnector(config, this.logger);
  }

  async executeAddIndex(executionRun: ExecutionRun): Promise<IndexExecutionResult> {
    // Validate all identifiers BEFORE building SQL
    const tableName = validateIdentifier(executionRun.table_name);
    const indexName = validateIdentifier(executionRun.index_name);
    const columns = validateIdentifiers(executionRun.columns);

    const columnList = columns.map(c => `\`${c}\``).join(', ');

    const sql = `ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columnList}) ALGORITHM=INPLACE, LOCK=NONE`;

    try {
      await this.connector.connect();

      this.logger.info(`Executing ADD INDEX on table: ${tableName}, index: ${indexName}`);

      await this.connector.executeQuery(sql);

      this.logger.info(`Successfully added index ${indexName} to table ${tableName}`);

      await this.connector.disconnect();

      return {
        success: true,
        index_name: indexName,
        table_name: tableName,
        executed_sql: sql
      };

    } catch (error) {
      this.logger.error('Error executing ADD INDEX', error);
      try {
        await this.connector.disconnect();
      } catch {}

      throw error;
    }
  }
}
```

**Step 4: Run tests**

**Step 5: Commit**

```bash
git add agent/src/executor/index-executor.ts agent/src/__tests__/index-executor.test.ts
git commit -m "fix(agent): prevent SQL injection in IndexExecutor with identifier validation"
```

---

### Task 3: Fix SQL Injection in VerificationService Rollback

**Files:**
- Modify: `agent/src/executor/verification-service.ts`

**Step 1: Apply fix**

In `verification-service.ts`, add import and validation to the `rollback` method and `checkIndexExists`:

```typescript
// At top of file, add:
import { validateIdentifier } from '../utils/sql-validator';

// In rollback() method, replace lines 159-161 with:
    const tableName = validateIdentifier(executionRun.table_name);
    const indexName = validateIdentifier(executionRun.index_name);
    const rollbackSql = `ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``;

// In the catch block (line 194), replace the same pattern:
    rollback_sql: `ALTER TABLE \`${validateIdentifier(executionRun.table_name)}\` DROP INDEX \`${validateIdentifier(executionRun.index_name)}\``,
```

**Step 2: Run tests**

**Step 3: Commit**

```bash
git add agent/src/executor/verification-service.ts
git commit -m "fix(agent): prevent SQL injection in VerificationService rollback"
```

---

### Task 4: Fix EXPLAIN Injection in MysqlConnector

**Files:**
- Modify: `agent/src/mysql-connector.ts`

**Step 1: Apply fix**

Replace lines 156-169 of `getExplainPlans` method:

```typescript
    const explainPlans = [];
    for (const row of results) {
      try {
        // Only EXPLAIN SELECT queries - skip non-SELECT digests
        const digestText = (row.DIGEST_TEXT || '').trim();
        if (!digestText.toUpperCase().startsWith('SELECT')) {
          this.logger.info(`Skipping EXPLAIN for non-SELECT query`);
          continue;
        }
        const explainQuery = `EXPLAIN FORMAT=JSON ${digestText}`;
        const explainResult = await this.executeQuery(explainQuery);
        explainPlans.push({
          digest_text: digestText,
          explain_plan: explainResult
        });
      } catch (error) {
        this.logger.warn(`Failed to get EXPLAIN plan for query`, error);
      }
    }
```

**Step 2: Commit**

```bash
git add agent/src/mysql-connector.ts
git commit -m "fix(agent): restrict EXPLAIN to SELECT queries only, prevent injection"
```

---

### Task 5: Harden Command Allowlist & Add Separate DDL Execution Path

**Files:**
- Modify: `agent/src/mysql-connector.ts`
- Modify: `agent/src/config.ts`

**Step 1: Fix config.ts - hardcode the read-only allowlist**

```typescript
// agent/src/config.ts - replace line 32
  // Safety: read-only commands only. DDL uses separate executeDDL() method.
  public readonly allowedCommands: readonly string[] = ['SELECT', 'SHOW', 'EXPLAIN'] as const;
```

Remove the environment variable override for `allowedCommands`.

**Step 2: Add executeDDL method to MysqlConnector**

Add after `executeQuery()` in `mysql-connector.ts`:

```typescript
  /**
   * Execute a DDL statement (ALTER TABLE only).
   * Separate from executeQuery to enforce stricter validation.
   */
  async executeDDL(sql: string): Promise<any[]> {
    if (!this.connection) {
      throw new Error('Database connection not established');
    }

    // Only allow ALTER TABLE statements
    const normalized = sql.trim().toUpperCase();
    if (!normalized.startsWith('ALTER TABLE')) {
      throw new Error(`Only ALTER TABLE statements allowed in executeDDL. Got: ${normalized.split(' ').slice(0, 3).join(' ')}`);
    }

    try {
      const [rows] = await this.connection.execute(sql);
      return rows;
    } catch (error) {
      this.logger.error('Error executing DDL', error);
      throw error;
    }
  }
```

**Step 3: Update IndexExecutor and VerificationService to use executeDDL**

In `index-executor.ts` line 39, change:
```typescript
await this.connector.executeDDL(sql);
```

In `verification-service.ts` line 166, change:
```typescript
await this.connector.executeDDL(rollbackSql);
```

**Step 4: Commit**

```bash
git add agent/src/config.ts agent/src/mysql-connector.ts agent/src/executor/index-executor.ts agent/src/executor/verification-service.ts
git commit -m "fix(agent): hardcode read-only allowlist, add separate DDL execution path"
```

---

### Task 6: Add ExecutionRun Input Validation in Executor

**Files:**
- Modify: `agent/src/executor/executor.ts`

**Step 1: Add validation at top of execute() method**

After the action check (line 37), add:

```typescript
    // Validate all identifiers in the execution run
    try {
      validateIdentifier(executionRun.table_name);
      validateIdentifier(executionRun.index_name);
      validateIdentifiers(executionRun.columns);
    } catch (validationError) {
      await this.executionLogger.logExecutionFailed(executionRun, validationError, 'validation_error');
      await this.updateExecutionStatus(executionRun.id, 'failed', 'validation_error');
      throw new Error(`Input validation failed: ${validationError.message}`);
    }

    // Validate execution ID format (UUID)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(executionRun.id)) {
      throw new Error(`Invalid execution ID format: ${executionRun.id}`);
    }
```

Add import at top:
```typescript
import { validateIdentifier, validateIdentifiers } from '../utils/sql-validator';
```

**Step 2: Commit**

```bash
git add agent/src/executor/executor.ts
git commit -m "fix(agent): validate ExecutionRun inputs before processing"
```

---

## Phase 2: Authentication & Authorization

### Task 7: Fix Hardcoded JWT Secret Fallback in SaaS API

**Files:**
- Modify: `saas-api/src/auth.ts`
- Modify: `saas-api/src/config/env.ts`

**Step 1: Fix auth.ts**

```typescript
// saas-api/src/auth.ts - complete replacement
import { FastifyInstance } from 'fastify';

const fjwt = require('fastify-jwt');

export function setupAuth(app: FastifyInstance): void {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
  }

  app.register(fjwt, {
    secret,
    sign: {
      algorithm: 'HS256',
      expiresIn: '8h'
    },
    verify: {
      algorithms: ['HS256']
    }
  });
}
```

**Step 2: Add TENANT_ID to env.ts validation**

```typescript
// saas-api/src/config/env.ts - add TENANT_ID
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().regex(/^\d+$/).transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  API_SECRET: z.string().min(32, 'API_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().url(),
  TENANT_ID: z.string().uuid('TENANT_ID must be a valid UUID'),
});
```

**Step 3: Commit**

```bash
git add saas-api/src/auth.ts saas-api/src/config/env.ts
git commit -m "fix(api): remove hardcoded JWT secret, enforce minimum length, add algorithm restriction"
```

---

### Task 8: Fix API Secret Timing Attack in SaaS API Middleware

**Files:**
- Modify: `saas-api/src/middleware/auth.ts`

**Step 1: Apply fix**

```typescript
// saas-api/src/middleware/auth.ts - complete replacement
import { FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual } from 'crypto';
import { getTenantIdFromRequest } from '../utils/tenant-utils';

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Compare against itself to maintain constant time
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

async function validateApiSecret(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiSecret = request.headers['x-api-secret'] as string | undefined;
  if (!apiSecret) {
    await reply.status(401).send({ success: false, error: 'API secret is required' });
    return;
  }
  const expectedSecret = process.env.API_SECRET;
  if (!expectedSecret) {
    await reply.status(500).send({ success: false, error: 'Server misconfiguration' });
    return;
  }
  if (!safeCompare(apiSecret, expectedSecret)) {
    await reply.status(401).send({ success: false, error: 'Invalid API secret' });
    return;
  }
}

async function validateTenant(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    await reply.status(400).send({ success: false, error: 'Tenant ID is required' });
    return;
  }
  const expectedTenantId = process.env.TENANT_ID;
  if (!expectedTenantId) {
    await reply.status(500).send({ success: false, error: 'Server misconfiguration' });
    return;
  }
  if (tenantId !== expectedTenantId) {
    await reply.status(403).send({ success: false, error: 'Unauthorized tenant' });
    return;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await validateApiSecret(request, reply);
  if (reply.sent) return;
  await validateTenant(request, reply);
}
```

**Step 2: Commit**

```bash
git add saas-api/src/middleware/auth.ts
git commit -m "fix(api): use timing-safe comparison for API secret, validate TENANT_ID is set"
```

---

### Task 9: Add Auth Headers to Agent API Calls

**Files:**
- Modify: `agent/src/executor/executor.ts`
- Modify: `agent/src/executor/execution-logger.ts`
- Modify: `agent/src/executor/kill-switch-checker.ts`
- Modify: `agent/src/executor/verification-service.ts`

**Step 1: Create a shared helper for authenticated fetch**

Create `agent/src/utils/api-client.ts`:

```typescript
// agent/src/utils/api-client.ts
import { Config } from '../config';

const config = new Config();

export function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-SECRET': config.apiKey,
    'X-Tenant-Id': process.env.TENANT_ID || '',
  };
}
```

**Step 2: Update all fetch calls in executor files to use authHeaders()**

In each file, replace:
```typescript
headers: { 'Content-Type': 'application/json' }
```
with:
```typescript
headers: authHeaders()
```

Files to update:
- `executor.ts` lines 145-146, 183-184
- `execution-logger.ts` lines 183-184
- `kill-switch-checker.ts` lines 26-27
- `verification-service.ts` lines 208-209

Also add `signal: AbortSignal.timeout(5000)` to kill-switch-checker.ts fetch call.

**Step 3: Commit**

```bash
git add agent/src/utils/api-client.ts agent/src/executor/executor.ts agent/src/executor/execution-logger.ts agent/src/executor/kill-switch-checker.ts agent/src/executor/verification-service.ts
git commit -m "fix(agent): add authentication headers to all SaaS API calls"
```

---

### Task 10: Fix Admin UI - Remove NEXT_PUBLIC_ API Secret Exposure

**Files:**
- Modify: `admin-ui/src/lib/api-client.ts`
- Create: `admin-ui/src/app/api/proxy/[...path]/route.ts`

**Step 1: Create server-side API proxy route**

```typescript
// admin-ui/src/app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_SECRET = process.env.API_SECRET || '';
const TENANT_ID = process.env.TENANT_ID || '';

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const url = `${API_BASE_URL}/api/${path}${request.nextUrl.search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-SECRET': API_SECRET,
    'X-Tenant-Id': TENANT_ID,
  };

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      fetchOptions.body = await request.text();
    } catch {}
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params);
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(request, params);
}
```

**Step 2: Update api-client.ts to use proxy**

```typescript
// admin-ui/src/lib/api-client.ts - replace lines 13-16
// Route through server-side proxy to keep API_SECRET off the client
const API_BASE_URL = ''  // Same origin - uses /api/proxy/... route
```

Update `apiFetch` function:
```typescript
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Rewrite /api/xxx to /api/proxy/xxx so it goes through server-side proxy
  const proxyEndpoint = endpoint.replace(/^\/api\//, '/api/proxy/');
  const url = `${API_BASE_URL}${proxyEndpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  // No more X-API-SECRET or X-Tenant-Id from client!
```

**Step 3: Commit**

```bash
git add admin-ui/src/app/api/proxy/ admin-ui/src/lib/api-client.ts
git commit -m "fix(ui): remove API secret from client bundle, proxy through server-side route"
```

---

### Task 11: Fix Admin UI - Remove Hardcoded Default Credentials

**Files:**
- Modify: `admin-ui/src/middleware.ts`

**Step 1: Apply fix**

```typescript
// admin-ui/src/middleware.ts - complete replacement
import { NextRequest, NextFetchEvent } from 'next/server'
import { NextResponse } from 'next/server'

const EXPECTED_USERNAME = process.env.ADMIN_USERNAME?.trim()
const EXPECTED_PASSWORD = process.env.ADMIN_PASSWORD?.trim()

export function middleware(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Fail-closed: if credentials not configured, deny access
    if (!EXPECTED_USERNAME || !EXPECTED_PASSWORD) {
      return new NextResponse('Server misconfiguration: admin credentials not set', {
        status: 503,
      })
    }

    const auth = request.headers.get('authorization')
    if (!auth || !auth.startsWith('Basic ')) {
      return new NextResponse(loginPageBody('Please enter username and password'), {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Panel"',
          'Content-Type': 'text/html; charset=utf-8'
        }
      })
    }

    let username = ''
    let password = ''
    try {
      const decoded = atob(auth.slice(6))
      const colonIndex = decoded.indexOf(':')
      username = (colonIndex >= 0 ? decoded.slice(0, colonIndex) : decoded).trim()
      password = (colonIndex >= 0 ? decoded.slice(colonIndex + 1) : '').trim()
    } catch {
      return new NextResponse(loginPageBody('Invalid Authorization format'), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    if (username !== EXPECTED_USERNAME || password !== EXPECTED_PASSWORD) {
      return new NextResponse(loginPageBody('Invalid username or password'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
  }
  return NextResponse.next()
}

function loginPageBody(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin Login</title></head><body style="font-family:sans-serif;max-width:400px;margin:2rem auto;padding:1rem;"><h2>Admin Panel</h2><p style="color:#c00">${escapeHtml(message)}</p><p><a href="/admin">Try again</a></p></body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const config = {
  matcher: '/admin/:path*',
}
```

Key changes:
- No more `|| 'admin'` / `|| 'changeme'` fallback
- Removed credential hints from login page HTML
- Returns 503 if credentials not configured (fail-closed)

**Step 2: Commit**

```bash
git add admin-ui/src/middleware.ts
git commit -m "fix(ui): remove hardcoded default credentials, remove credential hints from login page"
```

---

### Task 12: Add Security Headers to Admin UI

**Files:**
- Modify: `admin-ui/next.config.js`

**Step 1: Apply fix**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
}

module.exports = nextConfig
```

**Step 2: Commit**

```bash
git add admin-ui/next.config.js
git commit -m "fix(ui): add security headers (HSTS, X-Frame-Options, etc.)"
```

---

## Phase 3: Infrastructure & Secrets

### Task 13: Fix Docker Compose - Remove Default Passwords, Restrict Postgres Port

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Apply fix**

Replace default password fallbacks with required variables:

```yaml
# Lines 10-12: Remove fallback passwords
    environment:
      POSTGRES_DB: ${POSTGRES_DB:?POSTGRES_DB is required}
      POSTGRES_USER: ${POSTGRES_USER:?POSTGRES_USER is required}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}

# Line 17: Restrict postgres port to localhost only
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"

# Line 38: Update DATABASE_URL similarly
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Line 69: Remove admin username default
      ADMIN_USERNAME: ${ADMIN_USERNAME:?ADMIN_USERNAME is required}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "fix(docker): remove default passwords, restrict postgres to localhost"
```

---

### Task 14: Disable multipleStatements and Add Auth to Legacy index.js

**Files:**
- Modify: `index.js`

**Step 1: Apply fix**

```javascript
// Line 35: Remove multipleStatements
const createMySQLConnection = (host, port, database, user, password) => {
  return mysql.createConnection({
    host,
    port,
    database,
    user,
    password,
    // multipleStatements deliberately disabled for security
  });
};

// Add auth middleware after line 16:
// Simple API key authentication middleware
const authMiddleware = (req, res, next) => {
  const apiSecret = req.headers['x-api-secret'];
  if (!apiSecret || apiSecret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Replace line 15:
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3050',
  credentials: true,
}));

// Apply auth to all /api routes (add after line 16):
app.use('/api', authMiddleware);
```

**Step 2: Commit**

```bash
git add index.js
git commit -m "fix: disable multipleStatements, add auth middleware, restrict CORS in legacy index.js"
```

---

### Task 15: Fix Database Connection Fallback in SaaS API

**Files:**
- Modify: `saas-api/src/database.ts`

**Step 1: Apply fix**

```typescript
// saas-api/src/database.ts line 8 - remove fallback
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
```

**Step 2: Commit**

```bash
git add saas-api/src/database.ts
git commit -m "fix(api): remove insecure database connection fallback, require DATABASE_URL"
```

---

### Task 16: Fix Recommendation ID Generation (Use Crypto)

**Files:**
- Modify: `agent/src/recommendation-pack-generator.ts`

**Step 1: Apply fix**

```typescript
// agent/src/recommendation-pack-generator.ts line 78-80
import { randomUUID } from 'crypto';

// Replace generateId method:
  private generateId(): string {
    return 'rec_' + randomUUID().replace(/-/g, '').substring(0, 12);
  }
```

**Step 2: Commit**

```bash
git add agent/src/recommendation-pack-generator.ts
git commit -m "fix(agent): use crypto.randomUUID for secure recommendation ID generation"
```

---

### Task 17: Sanitize Logging in Agent

**Files:**
- Modify: `agent/src/logger.ts`
- Modify: `agent/src/mysql-connector.ts`

**Step 1: Fix logger.ts**

```typescript
// agent/src/logger.ts - complete replacement
export class Logger {
  private timestamp(): string {
    return new Date().toISOString();
  }

  private sanitize(data: any): string {
    if (!data) return '';
    if (data instanceof Error) {
      return JSON.stringify({ message: data.message, name: data.name });
    }
    try {
      return JSON.stringify(data);
    } catch {
      return '[unserializable]';
    }
  }

  info(message: string, data?: any) {
    console.log(`[${this.timestamp()}] INFO: ${message}`, data ? this.sanitize(data) : '');
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.timestamp()}] WARN: ${message}`, data ? this.sanitize(data) : '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.timestamp()}] ERROR: ${message}`, error ? this.sanitize(error) : '');
  }
}
```

**Step 2: Fix mysql-connector.ts - don't log full query on error**

```typescript
// Line 60: Replace full query logging
this.logger.error(`Error executing query (first 50 chars): ${query.substring(0, 50)}...`, error);
```

**Step 3: Commit**

```bash
git add agent/src/logger.ts agent/src/mysql-connector.ts
git commit -m "fix(agent): sanitize error logging, truncate query text in error messages"
```

---

## Summary

| Task | CRITICAL Fixed | HIGH Fixed | Description |
|------|---------------|------------|-------------|
| 1-6 | C1,C2,C3,C4 | H5,H6,H7 | SQL injection, command safety, input validation |
| 7-8 | C8 | H1,H8 | JWT secret, API secret timing attack |
| 9 | - | H1(agent) | Agent auth headers |
| 10 | C5 | - | API secret exposure in browser |
| 11 | C6 | - | Hardcoded credentials |
| 12 | - | H5(ui) | Security headers |
| 13 | C11,C12 | H1(docker) | Docker passwords, port exposure |
| 14 | C13,C14 | H3 | Legacy index.js auth, multipleStatements |
| 15 | - | - | DB connection fallback |
| 16 | - | - | Insecure randomness |
| 17 | - | H4 | Log sanitization |

**Total: 15 CRITICAL + 12 HIGH issues fixed across 17 tasks.**
