# SaaS API Endpoints Implementation Plan

## Design Principles

1. **Minimal Change / Thin API Layer** - เริ่มจาก routes + handlers + validation + auth middleware แบบบางๆ ก่อน ค่อย refactor เป็น services ทีหลัง
2. **Auth + Fail-safe** - ทุก /api/* ต้องตรวจ API_SECRET และ tenant_id
3. **Multi-tenant Enforcement** - ทุก resource ต้อง require tenant_id, ห้าม query ข้าม tenant
4. **Idempotency / Safety** - approve/schedule ต้อง idempotent, validate state transitions
5. **Stable Response Shape** - รองรับ pagination, detail endpoints รวมข้อมูลที่จำเป็น

---

## สรุปสถานะปัจจุบัน

### สิ่งที่มีอยู่แล้ว:
- **ไม่มี endpoint ใดๆ ที่ implement ไว้เลย**
- `saas-api/src/index.ts` มีแค่ boilerplate code
- import `registerRoutes` แต่ไฟล์ไม่มีอยู่จริง
- Database ใช้ MongoDB

---

## Priority-based Implementation

### P0 - Critical (ต้องมีเพื่อให้ UI กดได้จริง)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connections` | GET | List all connections |
| `/api/recommendations` | GET | List recommendations with filters |
| `/api/recommendations/:id/approve` | POST | Approve recommendation (idempotent) |
| `/api/recommendations/:id/schedule` | POST | Schedule recommendation |
| `/api/executions` | GET | List executions with filters |
| `/api/executions/:id` | GET | Get execution detail (with timeline, metrics, verification, rollback) |
| `/api/kill-switch` | GET | Get all kill switch status |
| `/api/kill-switch/enable` | POST | Enable kill switch (global or per-connection) |
| `/api/kill-switch/disable` | POST | Disable kill switch (global or per-connection) |
| `/api/audit` | POST | Create audit log entry (for agent+UI to send logs) |

### P1 - Important (ตามมา)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/connections/:id` | GET | Get connection detail |
| `/api/connections/:id/enable` | POST | Enable connection |
| `/api/connections/:id/disable` | POST | Disable connection |
| `/api/recommendations/:id` | GET | Get recommendation detail |
| `/api/recommendations/:id/reject` | POST | Reject recommendation |
| `/api/executions/:id/claim` | POST | Claim execution (atomic, 409 if already claimed) |
| `/api/executions/:id/status` | PATCH | Update execution status (validate state machine) |
| `/api/audit` | GET | List/filter audit logs |

---

## แผนการ Implementation (Thin Layer)

### โครงสร้างไฟล์ที่จะสร้าง (Minimal):

```
saas-api/src/
├── index.ts                    # แก้ไข - ลบ import ที่ไม่มีอยู่
├── database.ts                 # มีอยู่แล้ว
├── middleware/
│   └── auth.ts                 # API Secret + Tenant verification
├── routes/
│   ├── index.ts                # Register all routes
│   ├── connections.ts          # Connection endpoints
│   ├── recommendations.ts      # Recommendation endpoints
│   ├── executions.ts           # Execution endpoints
│   ├── kill-switch.ts          # Kill switch endpoints
│   └── audit.ts                # Audit log endpoints
└── utils/
    └── response.ts             # Standardized response helpers
```

> **Note:** services/ directory จะถูกเพิ่มทีหลังเมื่อ refactor หลังจาก endpoints ใช้งานจริงแล้ว

---

## Security & Multi-tenant Requirements

### Auth Middleware (`saas-api/src/middleware/auth.ts`)

```typescript
import { FastifyReply, FastifyRequest } from 'fastify';

// Extended request with tenant context
declare module 'fastify' {
  interface FastifyRequest {
    tenantId?: string;
  }
}

export async function verifyApiSecret(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip auth for health check
  if (request.url === '/health') return;

  const apiSecret = request.headers['x-api-secret'];
  const tenantId = request.headers['x-tenant-id'] as string;
  const expectedSecret = process.env.API_SECRET;

  // Verify API Secret
  if (!expectedSecret) {
    return reply.status(500).send({
      success: false,
      error: 'API_SECRET not configured'
    });
  }

  if (!apiSecret || apiSecret !== expectedSecret) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized: Invalid API Secret'
    });
  }

  // Verify Tenant ID
  if (!tenantId) {
    return reply.status(400).send({
      success: false,
      error: 'Missing X-Tenant-ID header'
    });
  }

  // Attach tenant to request for downstream use
  request.tenantId = tenantId;
}
```

### Audit Helper (inline in routes, no separate file)

```typescript
// ใช้ inline ใน routes แทนที่จะเป็น separate middleware
async function logAudit(
  db: any,
  tenantId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any
) {
  const { v4: uuidv4 } = require('uuid');
  await db.collection('audit_logs').insertOne({
    id: uuidv4(),
    tenant_id: tenantId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date()
  });
}
```

---

## P0 Routes Implementation (Thin Layer)

### Connections (`saas-api/src/routes/connections.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { getDB } from '../database';

export async function connectionsRoutes(app: FastifyInstance) {
  const db = getDB();

  // GET /api/connections - List all connections (P0)
  // Multi-tenant: filter by tenant_id
  // Pagination: limit/offset
  app.get('/api/connections', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { limit = 50, offset = 0 } = request.query as {
      limit?: number;
      offset?: number
    };

    const connections = await db.collection('connection_profiles')
      .find({ tenant_id: tenantId })
      .project({ encrypted_password: 0 })
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray();

    const total = await db.collection('connection_profiles')
      .countDocuments({ tenant_id: tenantId });

    return reply.send({
      success: true,
      data: connections,
      pagination: { limit: Number(limit), offset: Number(offset), total }
    });
  });

  // GET /api/connections/:id - Get connection detail (P1)
  app.get('/api/connections/:id', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };
    
    const connection = await db.collection('connection_profiles')
      .findOne(
        { id, tenant_id: tenantId },
        { projection: { encrypted_password: 0 } }
      );

    if (!connection) {
      return reply.status(404).send({
        success: false,
        error: 'Connection not found'
      });
    }

    return reply.send({
      success: true,
      data: connection
    });
  });

  // POST /api/connections/:id/enable - Enable connection (P1)
  app.post('/api/connections/:id/enable', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };

    const result = await db.collection('connection_profiles')
      .updateOne(
        { id, tenant_id: tenantId },
        { $set: { is_active: true, updated_at: new Date() } }
      );

    if (result.matchedCount === 0) {
      return reply.status(404).send({
        success: false,
        error: 'Connection not found'
      });
    }

    // Inline audit
    await logAudit(db, tenantId, 'ENABLE_CONNECTION', 'connection', id, {});

    return reply.send({
      success: true,
      data: { id, status: 'active' }
    });
  });

  // POST /api/connections/:id/disable - Disable connection (P1)
  app.post('/api/connections/:id/disable', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };

    const result = await db.collection('connection_profiles')
      .updateOne(
        { id, tenant_id: tenantId },
        { $set: { is_active: false, updated_at: new Date() } }
      );

    if (result.matchedCount === 0) {
      return reply.status(404).send({
        success: false,
        error: 'Connection not found'
      });
    }

    // Inline audit
    await logAudit(db, tenantId, 'DISABLE_CONNECTION', 'connection', id, {});

    return reply.send({
      success: true,
      data: { id, status: 'disabled' }
    });
  });
}

// Inline audit helper
async function logAudit(
  db: any,
  tenantId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any
) {
  const { v4: uuidv4 } = require('uuid');
  await db.collection('audit_logs').insertOne({
    id: uuidv4(),
    tenant_id: tenantId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date()
  });
}
```

### Recommendations (`saas-api/src/routes/recommendations.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { getDB } from '../database';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['approved', 'scheduled', 'rejected'],
  approved: ['scheduled', 'executed'],
  scheduled: ['executed', 'rejected'],
  executed: [],
  failed: [],
  rejected: []
};

export async function recommendationsRoutes(app: FastifyInstance) {
  const db = getDB();

  // GET /api/recommendations - List recommendations (P0)
  // Multi-tenant + filters + pagination
  app.get('/api/recommendations', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { connectionId, status, limit = 50, offset = 0 } = request.query as {
      connectionId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    };

    const filter: any = { tenant_id: tenantId };
    if (connectionId) filter.connection_id = connectionId;
    if (status) filter.status = status;

    const recommendations = await db.collection('recommendation_packs')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray();

    const total = await db.collection('recommendation_packs')
      .countDocuments(filter);

    return reply.send({
      success: true,
      data: recommendations,
      pagination: { limit: Number(limit), offset: Number(offset), total }
    });
  });

  // GET /api/recommendations/:id - Get recommendation detail (P1)
  app.get('/api/recommendations/:id', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };

    const recommendation = await db.collection('recommendation_packs')
      .findOne({ id, tenant_id: tenantId });

    if (!recommendation) {
      return reply.status(404).send({
        success: false,
        error: 'Recommendation not found'
      });
    }

    return reply.send({
      success: true,
      data: recommendation
    });
  });

  // POST /api/recommendations/:id/approve - Approve recommendation (P0)
  // Idempotent: if already approved, return success
  // State machine: only pending can be approved
  app.post('/api/recommendations/:id/approve', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };

    // Get current state
    const recommendation = await db.collection('recommendation_packs')
      .findOne({ id, tenant_id: tenantId });

    if (!recommendation) {
      return reply.status(404).send({
        success: false,
        error: 'Recommendation not found'
      });
    }

    // Idempotent: already approved
    if (recommendation.status === 'approved') {
      return reply.send({
        success: true,
        data: { id, status: 'approved', message: 'Already approved' }
      });
    }

    // Validate state transition
    if (!VALID_TRANSITIONS[recommendation.status]?.includes('approved')) {
      return reply.status(400).send({
        success: false,
        error: `Cannot approve from status: ${recommendation.status}`
      });
    }

    // Update status
    await db.collection('recommendation_packs')
      .updateOne(
        { id, tenant_id: tenantId },
        {
          $set: {
            status: 'approved',
            approved_at: new Date(),
            updated_at: new Date()
          }
        }
      );

    // Create approval record
    const { v4: uuidv4 } = require('uuid');
    await db.collection('approvals').insertOne({
      id: uuidv4(),
      tenant_id: tenantId,
      recommendation_pack_id: id,
      status: 'approved',
      approved_at: new Date(),
      created_at: new Date()
    });

    // Audit
    await logAudit(db, tenantId, 'APPROVE_RECOMMENDATION', 'recommendation', id, {});

    return reply.send({
      success: true,
      data: { id, status: 'approved' }
    });
  });

  // POST /api/recommendations/:id/schedule - Schedule recommendation (P0)
  // State machine: only pending or approved can be scheduled
  // Prevent re-schedule in wrong state
  app.post('/api/recommendations/:id/schedule', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };
    const { scheduledAt } = request.body as { scheduledAt: string };

    if (!scheduledAt) {
      return reply.status(400).send({
        success: false,
        error: 'scheduledAt is required'
      });
    }

    // Get current state
    const recommendation = await db.collection('recommendation_packs')
      .findOne({ id, tenant_id: tenantId });

    if (!recommendation) {
      return reply.status(404).send({
        success: false,
        error: 'Recommendation not found'
      });
    }

    // Validate state transition
    if (!VALID_TRANSITIONS[recommendation.status]?.includes('scheduled')) {
      return reply.status(400).send({
        success: false,
        error: `Cannot schedule from status: ${recommendation.status}`
      });
    }

    // Update status
    await db.collection('recommendation_packs')
      .updateOne(
        { id, tenant_id: tenantId },
        {
          $set: {
            status: 'scheduled',
            scheduled_at: new Date(scheduledAt),
            updated_at: new Date()
          }
        }
      );

    // Audit
    await logAudit(db, tenantId, 'SCHEDULE_RECOMMENDATION', 'recommendation', id, { scheduled_at: scheduledAt });

    return reply.send({
      success: true,
      data: { id, status: 'scheduled', scheduledAt }
    });
  });

  // POST /api/recommendations/:id/reject - Reject recommendation (P1)
  app.post('/api/recommendations/:id/reject', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };

    // Get current state
    const recommendation = await db.collection('recommendation_packs')
      .findOne({ id, tenant_id: tenantId });

    if (!recommendation) {
      return reply.status(404).send({
        success: false,
        error: 'Recommendation not found'
      });
    }

    // Validate state transition
    if (!VALID_TRANSITIONS[recommendation.status]?.includes('rejected')) {
      return reply.status(400).send({
        success: false,
        error: `Cannot reject from status: ${recommendation.status}`
      });
    }

    // Update status
    await db.collection('recommendation_packs')
      .updateOne(
        { id, tenant_id: tenantId },
        {
          $set: {
            status: 'rejected',
            rejection_reason: reason,
            rejected_at: new Date(),
            updated_at: new Date()
          }
        }
      );

    // Audit
    await logAudit(db, tenantId, 'REJECT_RECOMMENDATION', 'recommendation', id, { reason });

    return reply.send({
      success: true,
      data: { id, status: 'rejected' }
    });
  });
}

// Inline audit helper
async function logAudit(
  db: any,
  tenantId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any
) {
  const { v4: uuidv4 } = require('uuid');
  await db.collection('audit_logs').insertOne({
    id: uuidv4(),
    tenant_id: tenantId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date()
  });
}
```

### Executions (`saas-api/src/routes/executions.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { getDB } from '../database';

// Valid execution status transitions
const VALID_EXECUTION_TRANSITIONS: Record<string, string[]> = {
  pending: ['claimed', 'running'],
  claimed: ['running', 'pending'],  // can release claim
  running: ['completed', 'failed', 'rolled_back'],
  completed: [],
  failed: ['rolled_back'],
  rolled_back: []
};

export async function executionsRoutes(app: FastifyInstance) {
  const db = getDB();

  // GET /api/executions - List executions (P0)
  // Multi-tenant + filters + pagination + date range
  app.get('/api/executions', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { connectionId, status, startDate, endDate, limit = 50, offset = 0 } = request.query as {
      connectionId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    };

    const filter: any = { tenant_id: tenantId };
    if (connectionId) filter.connection_id = connectionId;
    if (status) filter.execution_status = status;
    if (startDate || endDate) {
      filter.executed_at = {};
      if (startDate) filter.executed_at.$gte = new Date(startDate);
      if (endDate) filter.executed_at.$lte = new Date(endDate);
    }

    const executions = await db.collection('execution_history')
      .find(filter)
      .sort({ executed_at: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray();

    const total = await db.collection('execution_history')
      .countDocuments(filter);

    return reply.send({
      success: true,
      data: executions,
      pagination: { limit: Number(limit), offset: Number(offset), total }
    });
  });

  // GET /api/executions/:id - Get execution detail (P0)
  // Include: timeline, metrics, verification, rollback info
  app.get('/api/executions/:id', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };

    const execution = await db.collection('execution_history')
      .findOne({ id, tenant_id: tenantId });

    if (!execution) {
      return reply.status(404).send({
        success: false,
        error: 'Execution not found'
      });
    }

    // Get verification metrics
    const verificationMetrics = await db.collection('verification_metrics')
      .findOne({ execution_id: id });

    // Get timeline events
    const timeline = await db.collection('execution_timeline')
      .find({ execution_id: id })
      .sort({ timestamp: 1 })
      .toArray();

    return reply.send({
      success: true,
      data: {
        ...execution,
        baselineMetrics: verificationMetrics?.before_metrics,
        afterMetrics: verificationMetrics?.after_metrics,
        timeline,
        verificationResult: verificationMetrics?.verification_result,
        rollbackInfo: execution.rollback_info
      }
    });
  });

  // POST /api/executions/:id/claim - Claim execution (P1)
  // Atomic: 409 if already claimed
  app.post('/api/executions/:id/claim', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };
    const { agentId } = request.body as { agentId: string };

    if (!agentId) {
      return reply.status(400).send({
        success: false,
        error: 'agentId is required'
      });
    }

    // Atomic claim
    const result = await db.collection('execution_history')
      .findOneAndUpdate(
        {
          id,
          tenant_id: tenantId,
          $or: [
            { execution_status: 'pending' },
            { claimed_by: null }
          ]
        },
        {
          $set: {
            execution_status: 'claimed',
            claimed_by: agentId,
            claimed_at: new Date()
          }
        },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      const existing = await db.collection('execution_history')
        .findOne({ id, tenant_id: tenantId });

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Execution not found'
        });
      }

      return reply.status(409).send({
        success: false,
        error: 'Execution already claimed',
        claimedBy: existing.claimed_by
      });
    }

    return reply.send({
      success: true,
      data: { id, status: 'claimed', claimedBy: agentId }
    });
  });

  // PATCH /api/executions/:id/status - Update execution status (P1)
  app.patch('/api/executions/:id/status', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };
    const { status, errorMessage } = request.body as { status: string; errorMessage?: string };

    const execution = await db.collection('execution_history')
      .findOne({ id, tenant_id: tenantId });

    if (!execution) {
      return reply.status(404).send({
        success: false,
        error: 'Execution not found'
      });
    }

    const currentStatus = execution.execution_status || 'pending';
    if (!VALID_EXECUTION_TRANSITIONS[currentStatus]?.includes(status)) {
      return reply.status(400).send({
        success: false,
        error: `Invalid transition from ${currentStatus} to ${status}`
      });
    }

    const updateData: any = { execution_status: status, updated_at: new Date() };
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date();
    }
    if (errorMessage) updateData.error_message = errorMessage;

    await db.collection('execution_history')
      .updateOne({ id, tenant_id: tenantId }, { $set: updateData });

    return reply.send({
      success: true,
      data: { id, status }
    });
  });
}
```

### Kill Switch (`saas-api/src/routes/kill-switch.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { getDB } from '../database';

// In-memory state per tenant (should be moved to Redis in production)
// Key format: "global" or "connection:{connectionId}"
const killSwitchState: Map<string, Map<string, boolean>> = new Map();

function getTenantState(tenantId: string): Map<string, boolean> {
  if (!killSwitchState.has(tenantId)) {
    killSwitchState.set(tenantId, new Map([['global', false]]));
  }
  return killSwitchState.get(tenantId)!;
}

export async function killSwitchRoutes(app: FastifyInstance) {
  const db = getDB();

  // GET /api/kill-switch - Get all kill switch status (P0)
  app.get('/api/kill-switch', async (request, reply) => {
    const tenantId = request.tenantId!;
    const state = getTenantState(tenantId);
    
    const connections: Record<string, boolean> = {};
    state.forEach((value, key) => {
      if (key !== 'global') {
        connections[key] = value;
      }
    });

    return reply.send({
      success: true,
      data: {
        global: state.get('global') || false,
        connections
      }
    });
  });

  // POST /api/kill-switch/enable - Enable kill switch (P0)
  app.post('/api/kill-switch/enable', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { connectionId, reason } = request.body as {
      connectionId?: string;
      reason: string;
    };

    if (!reason || reason.trim() === '') {
      return reply.status(400).send({
        success: false,
        error: 'reason is required'
      });
    }

    const state = getTenantState(tenantId);
    const key = connectionId || 'global';
    state.set(key, true);

    // Log to database
    const { v4: uuidv4 } = require('uuid');
    await db.collection('kill_switch_audit').insertOne({
      id: uuidv4(),
      tenant_id: tenantId,
      scope: connectionId ? 'connection' : 'global',
      connection_id: connectionId || null,
      action: 'enabled',
      reason,
      triggered_by: 'admin',
      timestamp: new Date()
    });

    // Audit
    await logAudit(db, tenantId, 'ENABLE_KILL_SWITCH', connectionId ? 'connection' : 'global', key, { reason });

    return reply.send({
      success: true,
      data: {
        scope: connectionId ? 'connection' : 'global',
        connectionId,
        enabled: true,
        reason
      }
    });
  });

  // POST /api/kill-switch/disable - Disable kill switch (P0)
  app.post('/api/kill-switch/disable', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { connectionId, reason } = request.body as {
      connectionId?: string;
      reason: string;
    };

    if (!reason || reason.trim() === '') {
      return reply.status(400).send({
        success: false,
        error: 'reason is required'
      });
    }

    const state = getTenantState(tenantId);
    const key = connectionId || 'global';
    state.set(key, false);

    // Log to database
    const { v4: uuidv4 } = require('uuid');
    await db.collection('kill_switch_audit').insertOne({
      id: uuidv4(),
      tenant_id: tenantId,
      scope: connectionId ? 'connection' : 'global',
      connection_id: connectionId || null,
      action: 'disabled',
      reason,
      triggered_by: 'admin',
      timestamp: new Date()
    });

    // Audit
    await logAudit(db, tenantId, 'DISABLE_KILL_SWITCH', connectionId ? 'connection' : 'global', key, { reason });

    return reply.send({
      success: true,
      data: {
        scope: connectionId ? 'connection' : 'global',
        connectionId,
        enabled: false,
        reason
      }
    });
  });
}

// Inline audit helper
async function logAudit(
  db: any,
  tenantId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any
) {
  const { v4: uuidv4 } = require('uuid');
  await db.collection('audit_logs').insertOne({
    id: uuidv4(),
    tenant_id: tenantId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date()
  });
}
```

### Audit (`saas-api/src/routes/audit.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { getDB } from '../database';

export async function auditRoutes(app: FastifyInstance) {
  const db = getDB();

  // POST /api/audit - Create audit log entry (P0)
  // Allow agent and UI to send audit logs
  app.post('/api/audit', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { action, resourceType, resourceId, details } = request.body as {
      action: string;
      resourceType: string;
      resourceId: string;
      details?: any;
    };

    if (!action || !resourceType || !resourceId) {
      return reply.status(400).send({
        success: false,
        error: 'action, resourceType, and resourceId are required'
      });
    }

    const { v4: uuidv4 } = require('uuid');
    const auditLog = {
      id: uuidv4(),
      tenant_id: tenantId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details || {},
      created_at: new Date()
    };

    await db.collection('audit_logs').insertOne(auditLog);

    return reply.send({
      success: true,
      data: { id: auditLog.id }
    });
  });

  // GET /api/audit - List audit logs (P1)
  // Multi-tenant + filters + pagination
  app.get('/api/audit', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { action, connectionId, startDate, endDate, limit = 100, offset = 0 } = request.query as {
      action?: string;
      connectionId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    };

    const filter: any = { tenant_id: tenantId };
    if (action) filter.action = action;
    if (connectionId) filter.resource_id = connectionId;
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = new Date(startDate);
      if (endDate) filter.created_at.$lte = new Date(endDate);
    }

    const auditLogs = await db.collection('audit_logs')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray();

    const total = await db.collection('audit_logs')
      .countDocuments(filter);

    return reply.send({
      success: true,
      data: auditLogs,
      pagination: { limit: Number(limit), offset: Number(offset), total }
    });
  });
}
```

### Routes Index (`saas-api/src/routes/index.ts`)

```typescript
import { FastifyInstance } from 'fastify';
import { verifyApiSecret } from '../middleware/auth';
import { connectionsRoutes } from './connections';
import { recommendationsRoutes } from './recommendations';
import { executionsRoutes } from './executions';
import { killSwitchRoutes } from './kill-switch';
import { auditRoutes } from './audit';

export async function registerRoutes(app: FastifyInstance) {
  // Add API Secret verification to all routes
  app.addHook('preHandler', verifyApiSecret);

  // Register all route modules
  await app.register(connectionsRoutes);
  await app.register(recommendationsRoutes);
  await app.register(executionsRoutes);
  await app.register(killSwitchRoutes);
  await app.register(auditRoutes);

  // Health check (no auth required)
  app.get('/health', async (request, reply) => {
    return reply.send({ status: 'ok' });
  });
}
```

---

### 3. แก้ไข index.ts

**File: `saas-api/src/index.ts`** (แก้ไข)

```typescript
import fastify from 'fastify';
import { connectDB } from './database';
import { registerRoutes } from './routes';

// Create Fastify instance
const app = fastify({
  logger: true
});

async function main() {
  try {
    // Connect to database
    await connectDB();
    
    // Register routes
    await registerRoutes(app);
    
    // Start server
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port: parseInt(port as string), host });
    console.log(`Server running at http://${host}:${port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
```

---

## Checklist สำหรับ Implementation

- [ ] สร้าง `saas-api/src/middleware/auth.ts`
- [ ] สร้าง `saas-api/src/middleware/audit.ts`
- [ ] สร้าง `saas-api/src/routes/connections.ts`
- [ ] สร้าง `saas-api/src/routes/recommendations.ts`
- [ ] สร้าง `saas-api/src/routes/executions.ts`
- [ ] สร้าง `saas-api/src/routes/kill-switch.ts`
- [ ] สร้าง `saas-api/src/routes/audit.ts`
- [ ] สร้าง `saas-api/src/routes/index.ts`
- [ ] แก้ไข `saas-api/src/index.ts`
- [ ] เพิ่ม uuid package ใน package.json
- [ ] ทดสอบ endpoints ทั้งหมด

---

## หมายเหตุสำคัญ

1. **API Secret Verification**: ทุก endpoint (ยกเว้น /health) ต้องผ่านการ verify API_SECRET header
2. **Response Format**: ทุก response ใช้ format `{ success: boolean, data: T, error?: string }`
3. **Audit Logging**: ทุก write action จะมี audit log บันทึกไว้
4. **Kill Switch**: ใช้ in-memory state ก่อน ควรย้ายไป Redis ในภายหลัง
5. **Admin UI Rule**: UI เป็น control panel ไม่ใช่ autonomous - ต้องมี explicit confirmation ทุกครั้ง
