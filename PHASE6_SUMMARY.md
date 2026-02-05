# Phase 6 Summary: Internal Admin Web UI (MVP)

## 1. Overview

Phase 6 เป็นการพัฒนา **Internal Admin Web UI** สำหรับ MySQL Production Optimizer ออกแบบเป็น **Control Panel** สำหรับ Internal Admins เท่านั้น โดยยึดหลัก **safety-first** และ **transparency**

### วัตถุประสงค์หลัก
- สร้าง UI สำหรับจัดการ database connections
- รีวิวและ approve optimization recommendations
- ติดตามสถานะ executions และดู metrics
- ควบคุม Kill Switch ทั้ง global และ per-connection

### Design Principles
| หลักการ | รายละเอียด |
|---------|------------|
| Read-only by Default | ทุกหน้าแสดงข้อมูลอย่างเดียว write ต้อง explicit trigger |
| Confirmation Required | ทุก write action ต้องผ่าน confirmation modal |
| Audit Everything | ทุก action ต้อง log audit trail |
| Kill Switch Visible | ถ้า kill switch active ต้องแสดง blocking banner |
| Scope Enforcement | UI รองรับเฉพาะ ADD_INDEX เท่านั้น |

---

## 2. Features Delivered

### 2.1 Connections Management
- ✅ List และดูสถานะ database connections
- ✅ Enable/Disable connections
- ✅ View connection details
- ✅ Status filtering

### 2.2 Recommendations Management
- ✅ List recommendations พร้อม status filtering
- ✅ View recommendation detail (SQL, execution plan, metrics)
- ✅ Approve recommendations พร้อม risk warning
- ✅ Schedule recommendations สำหรับ future execution

### 2.3 Executions Monitoring
- ✅ List execution history พร้อม filtering
- ✅ View execution detail
- ✅ Status timeline visualization
- ✅ Baseline vs After metrics comparison
- ✅ Verification result display
- ✅ Rollback information display

### 2.4 Kill Switch Control
- ✅ Global kill switch toggle
- ✅ Per-connection kill switch toggle
- ✅ Reason required for activation
- ✅ Audit trail for all kill switch actions
- ✅ Blocking banner when active

---

## 3. Project Structure

```
admin-ui/
├── .env.example                    # Environment variables template
├── next.config.js                  # Next.js configuration
├── package.json                    # Dependencies
├── postcss.config.js               # PostCSS config
├── tailwind.config.ts              # Tailwind CSS config
├── tsconfig.json                   # TypeScript config
├── README.md                       # Documentation
│
├── docs/
│   └── API_ENDPOINTS.md            # API documentation
│
└── src/
    ├── middleware.ts               # Basic Auth middleware
    │
    ├── app/
    │   ├── globals.css             # Global styles + Tailwind
    │   ├── layout.tsx              # Root layout
    │   │
    │   └── admin/                  # Admin route group
    │       ├── layout.tsx          # Admin layout with sidebar
    │       ├── page.tsx            # Dashboard home
    │       │
    │       ├── connections/
    │       │   ├── page.tsx        # Connection list
    │       │   └── [id]/page.tsx   # Connection detail
    │       │
    │       ├── recommendations/
    │       │   ├── page.tsx        # Recommendation list
    │       │   └── [id]/page.tsx   # Recommendation detail
    │       │
    │       ├── executions/
    │       │   ├── page.tsx        # Execution list
    │       │   └── [id]/page.tsx   # Execution detail
    │       │
    │       └── kill-switch/
    │           └── page.tsx        # Kill switch management
    │
    ├── components/
    │   ├── index.ts                # Component exports
    │   │
    │   ├── layout/
    │   │   ├── AdminLayout.tsx     # Main admin layout
    │   │   ├── Sidebar.tsx         # Navigation sidebar
    │   │   ├── Header.tsx          # Top header
    │   │   └── KillSwitchBanner.tsx
    │   │
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── ConfirmDialog.tsx
    │   │   ├── DataTable.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   ├── RiskWarning.tsx
    │   │   └── StatusBadge.tsx
    │   │
    │   ├── connections/
    │   │   ├── ConnectionActions.tsx
    │   │   ├── ConnectionStatusBadge.tsx
    │   │   └── ConnectionTable.tsx
    │   │
    │   ├── recommendations/
    │   │   ├── DDLPreview.tsx
    │   │   ├── ImpactAnalysis.tsx
    │   │   ├── RecommendationActions.tsx
    │   │   ├── RecommendationDetail.tsx
    │   │   ├── RecommendationStatusBadge.tsx
    │   │   └── RecommendationTable.tsx
    │   │
    │   ├── executions/
    │   │   ├── ExecutionDetail.tsx
    │   │   ├── ExecutionStatusBadge.tsx
    │   │   ├── ExecutionTable.tsx
    │   │   ├── ExecutionTimeline.tsx
    │   │   ├── MetricsComparison.tsx
    │   │   ├── RollbackInfo.tsx
    │   │   └── VerificationResult.tsx
    │   │
    │   ├── kill-switch/
    │   │   ├── ConnectionKillSwitchList.tsx
    │   │   ├── GlobalKillSwitch.tsx
    │   │   ├── KillSwitchAuditLog.tsx
    │   │   ├── KillSwitchConfirmDialog.tsx
    │   │   ├── KillSwitchStatusCard.tsx
    │   │   └── KillSwitchToggle.tsx
    │   │
    │   └── providers/
    │       └── QueryProvider.tsx    # React Query provider
    │
    ├── hooks/
    │   ├── useConnections.ts
    │   ├── useRecommendations.ts
    │   ├── useExecutions.ts
    │   └── useKillSwitch.ts
    │
    └── lib/
        ├── api-client.ts           # Base API client
        ├── auth.ts                 # Auth utilities
        └── types.ts                # TypeScript types
```

---

## 4. Phase 6.1: End-to-End Integration

หลังจากสร้าง MVP แล้ว ได้มีการปรับปรุงเพิ่มเติมเพื่อให้ระบบทำงานแบบ end-to-end ได้จริง

### 4.1 API Client Layer ที่ปรับปรุง

สร้าง fetch wrapper กลางที่ [`admin-ui/src/lib/api-client.ts`](admin-ui/src/lib/api-client.ts) พร้อมคุณสมบัติ:

| Feature | Description |
|---------|-------------|
| API_SECRET Header | ใส่ `x-api-secret` header ทุก request |
| Structured Response | Return `{ data, error, status, ok }` |
| Error Classification | จำแนก errors: 401/403, 404, 5xx, network |
| Type Safety | TypeScript types สำหรับทุก response |

#### Error Types

ไฟล์ [`admin-ui/src/lib/errors.ts`](admin-ui/src/lib/errors.ts) กำหนด error classes:

```typescript
// Error types ที่รองรับ
- ApiError          // Base error class
- AuthenticationError   // 401/403 errors
- NotFoundError         // 404 errors
- ServerError           // 5xx errors
- NetworkError          // Network/connection errors
```

#### API Client Response Structure

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}
```

### 4.2 SaaS API Endpoints ที่เพิ่ม

เพิ่มไฟล์ใหม่ใน `saas-api/src/` เพื่อรองรับทุก module:

#### Routes

| File | Module | Endpoints |
|------|--------|-----------|
| [`routes/connections.ts`](saas-api/src/routes/connections.ts) | Connections | List, Get, Update status |
| [`routes/recommendations.ts`](saas-api/src/routes/recommendations.ts) | Recommendations | List, Get, Approve, Schedule |
| [`routes/executions.ts`](saas-api/src/routes/executions.ts) | Executions | List, Get with metrics |
| [`routes/kill-switch.ts`](saas-api/src/routes/kill-switch.ts) | Kill Switch | Get status, Toggle, Logs |
| [`routes/audit.ts`](saas-api/src/routes/audit.ts) | Audit | Get audit logs |

#### Models

| File | Purpose |
|------|---------|
| [`models/connections.model.ts`](saas-api/src/models/connections.model.ts) | Connection data access |
| [`models/recommendations.model.ts`](saas-api/src/models/recommendations.model.ts) | Recommendation data access |
| [`models/executions.model.ts`](saas-api/src/models/executions.model.ts) | Execution data access |
| [`models/kill-switch.model.ts`](saas-api/src/models/kill-switch.model.ts) | Kill switch data access |
| [`models/audit.model.ts`](saas-api/src/models/audit.model.ts) | Audit log data access |
| [`models/metrics.model.ts`](saas-api/src/models/metrics.model.ts) | Metrics data access |

#### Middleware

| File | Purpose |
|------|---------|
| [`middleware/auth.ts`](saas-api/src/middleware/auth.ts) | API Secret verification |

### 4.3 E2E Demo Script

สร้าง [`admin-ui/docs/E2E_DEMO_SCRIPT.md`](admin-ui/docs/E2E_DEMO_SCRIPT.md) สำหรับทดสอบ end-to-end flow:

- **12 steps** สำหรับทดสอบทุก feature
- **Verification checklist** สำหรับตรวจสอบแต่ละ step
- **Troubleshooting guide** สำหรับแก้ปัญหาที่พบบ่อย

#### Demo Flow Overview

```
1. Start Services (SaaS API + Admin UI)
2. Login ด้วย Basic Auth
3. View Connections List
4. View Connection Detail
5. View Recommendations List
6. View Recommendation Detail
7. Approve Recommendation
8. View Executions List
9. View Execution Detail
10. Test Kill Switch Toggle
11. View Audit Logs
12. Verify End-to-End Integration
```

### 4.4 Updated File Structure (SaaS API)

```
saas-api/src/
├── index.ts                    # Main entry point
├── database.ts                 # Database connection
│
├── middleware/
│   └── auth.ts                 # API Secret verification ⭐ NEW
│
├── models/
│   ├── audit.model.ts          # Audit log model ⭐ NEW
│   ├── connections.model.ts    # Connection model ⭐ NEW
│   ├── executions.model.ts     # Execution model ⭐ NEW
│   ├── kill-switch.model.ts    # Kill switch model ⭐ NEW
│   ├── metrics.model.ts        # Metrics model ⭐ NEW
│   └── recommendations.model.ts # Recommendation model ⭐ NEW
│
├── routes/
│   ├── index.ts                # Route aggregator
│   ├── audit.ts                # Audit endpoints ⭐ NEW
│   ├── connections.ts          # Connection endpoints ⭐ NEW
│   ├── executions.ts           # Execution endpoints ⭐ NEW
│   ├── kill-switch.ts          # Kill switch endpoints ⭐ NEW
│   └── recommendations.ts      # Recommendation endpoints ⭐ NEW
│
└── utils/
    └── tenant-utils.ts         # Tenant utilities
```

### 4.5 วิธีรัน Services ทั้งหมดพร้อมกัน

#### Terminal 1: SaaS API

```bash
cd saas-api
npm install
cp .env.example .env
# Edit .env with database credentials
npm run dev
```

API จะ run ที่: `http://localhost:3001`

#### Terminal 2: Admin UI

```bash
cd admin-ui
npm install
cp .env.example .env.local
# Edit .env.local:
# - NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
# - API_SECRET=your-api-secret (ต้องตรงกับ SaaS API)
npm run dev
```

UI จะ run ที่: `http://localhost:3050/admin`

#### Environment Variables ที่ต้อง Match

| Service | Variable | Value |
|---------|----------|-------|
| SaaS API | API_SECRET | `your-secret-key` |
| Admin UI | API_SECRET | `your-secret-key` (ต้องตรงกัน) |

### 4.6 API Authentication Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Browser   │      │   Admin UI  │      │   SaaS API  │
│             │      │   (Next.js) │      │   (Express) │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │ 1. Request /admin  │                    │
       │───────────────────>│                    │
       │                    │                    │
       │ 2. Basic Auth      │                    │
       │<───────────────────│                    │
       │                    │                    │
       │ 3. Username/Pass   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │ 4. Middleware      │                    │
       │   validates        │                    │
       │                    │                    │
       │                    │ 5. API Request     │
       │                    │   + x-api-secret   │
       │                    │───────────────────>│
       │                    │                    │
       │                    │                    │ 6. Verify
       │                    │                    │    API_SECRET
       │                    │                    │
       │                    │ 7. JSON Response   │
       │                    │<───────────────────│
       │                    │                    │
       │ 8. Rendered Page   │                    │
       │<───────────────────│                    │
       │                    │                    │
```

---

## 5. Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 14+ |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| State Management | TanStack Query (React Query) | 5.x |
| HTTP Client | fetch API | native |
| Authentication | Basic Auth (HTTP) | - |
| Icons | Lucide React | latest |
| Backend | Express.js | 4.x |
| Database | MySQL | 8.x |

---

## 6. Safety Features

### 6.1 ตาม admin-ui-rule.md

| Rule | Implementation |
|------|----------------|
| UI เป็น CONTROL PANEL | ไม่มี automatic execution ทุก action ต้อง human trigger |
| Read-only by Default | ทุกหน้าแสดงข้อมูลอย่างเดียว |
| Guardrails Mandatory | RiskWarning component แสดง table size, impact, rollback plan |
| Confirmation Discipline | ConfirmDialog สำหรับทุก write action |
| Transparency | แสดง baseline/after metrics และ verification result |
| Scope Enforcement | รองรับเฉพาะ ADD_INDEX |
| Audit-first | ทุก click generate audit log |
| Fail-safe UX | disable action เมื่อ API unclear หรือ kill switch active |
| No Public Exposure | Basic Auth middleware ป้องกัน /admin routes |

### 6.2 Key Safety Components

1. **ConfirmDialog** - ทุก write action ต้องผ่าน confirmation
2. **RiskWarning** - แสดง risk level, table size, estimated impact
3. **KillSwitchBanner** - blocking banner เมื่อ kill switch active
4. **Audit Logging** - บันทึกทุก action พร้อม timestamp และ user

---

## 7. Environment Variables

```bash
# Admin UI Authentication
ADMIN_USERNAME=admin          # Username for Basic Auth
ADMIN_PASSWORD=changeme       # Password for Basic Auth

# SaaS API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001   # API base URL (public)
API_SECRET=your-api-secret                        # API secret key (private)

# App
NEXT_PUBLIC_APP_NAME=MySQL Optimizer Admin       # Application name
```

### Variable Matrix

| Variable | Used In | Public? | Required? |
|----------|---------|---------|-----------|
| ADMIN_USERNAME | Middleware | No | Yes |
| ADMIN_PASSWORD | Middleware | No | Yes |
| NEXT_PUBLIC_API_BASE_URL | API Client | Yes | Yes |
| API_SECRET | API Client | No | Yes |
| NEXT_PUBLIC_APP_NAME | UI | Yes | No |

---

## 8. How to Run

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- MySQL 8.x database

### Quick Start (Full Stack)

ดูรายละเอียดเพิ่มเติมใน Section 4.5 หรือ [`E2E_DEMO_SCRIPT.md`](admin-ui/docs/E2E_DEMO_SCRIPT.md)

```bash
# Terminal 1: SaaS API
cd saas-api && npm install && npm run dev

# Terminal 2: Admin UI
cd admin-ui && npm install && npm run dev
```

### Installation (Admin UI Only)

```bash
# Navigate to admin-ui directory
cd admin-ui

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your values
```

### Development

```bash
npm run dev
```

Access at: `http://localhost:3050/admin`

### Production Build

```bash
npm run build
npm start
```

---

## 9. API Integration

### Required SaaS API Endpoints

#### Connections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /connections | List all connections |
| GET | /connections/:id | Get connection detail |
| PUT | /connections/:id/status | Update connection status |

#### Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /recommendations | List recommendations |
| GET | /recommendations/:id | Get recommendation detail |
| POST | /recommendations/:id/approve | Approve recommendation |
| POST | /recommendations/:id/schedule | Schedule execution |

#### Executions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /executions | List executions |
| GET | /executions/:id | Get execution detail with metrics |

#### Kill Switch
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /kill-switch | Get kill switch status |
| POST | /kill-switch/:connectionId | Toggle kill switch |
| GET | /kill-switch/audit-logs | Get audit logs |

#### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /audit-logs | Get audit logs |

### API Client Configuration

API client ใช้ fetch API พร้อม:
- API_SECRET header สำหรับ authentication
- Error handling สำหรับ failed requests
- Type-safe responses ด้วย TypeScript

---

## 10. Next Steps

### Recommended Improvements

1. **Enhanced Authentication**
   - Implement JWT-based authentication
   - Add role-based access control (RBAC)
   - Session management

2. **Real-time Updates**
   - WebSocket integration สำหรับ live status updates
   - Push notifications สำหรับ execution status changes

3. **UI/UX Enhancements**
   - Dark mode support
   - Responsive design improvements
   - Accessibility (a11y) audit

4. **Monitoring & Observability**
   - Error tracking integration (Sentry)
   - Performance monitoring
   - User analytics

5. **Testing**
   - Unit tests สำหรับ components
   - Integration tests สำหรับ API calls
   - E2E tests ด้วย Playwright/Cypress

6. **API Enhancements**
   - Pagination optimization
   - Caching strategy
   - Rate limiting

---

## 11. Known Limitations

### Current Constraints

1. **Authentication**
   - ใช้ Basic Auth เท่านั้น (เหมาะสำหรับ internal use)
   - ไม่มี session timeout
   - ไม่มี multi-user support

2. **API Dependencies**
   - ต้องมี SaaS API running
   - บาง endpoints อาจยังไม่ implement ใน SaaS API

3. **UI Features**
   - ไม่มี real-time updates (polling only)
   - ไม่มี dark mode
   - ไม่มี mobile optimization

4. **Scope**
   - รองรับเฉพาะ ADD_INDEX action
   - ไม่รองรับ batch operations
   - ไม่มี export functionality

5. **Testing**
   - ยังไม่มี automated tests
   - Manual testing only

---

## 12. Summary

Phase 6 ส่งมอบ **Internal Admin Web UI** ที่ครบถ้วนตาม requirements พร้อม End-to-End Integration:

### MVP Deliverables (Phase 6.0)
- ✅ Next.js project พร้อม TypeScript และ Tailwind CSS
- ✅ 4 หน้าหลัก: Connections, Recommendations, Executions, Kill Switch
- ✅ Reusable components library
- ✅ Custom hooks สำหรับ data fetching
- ✅ Safety features ครบตาม admin-ui-rule
- ✅ Basic Auth middleware
- ✅ Documentation (README, API_ENDPOINTS)

### E2E Integration Deliverables (Phase 6.1)
- ✅ API Client Layer พร้อม error handling
- ✅ SaaS API endpoints ครบทุก module
- ✅ API Secret authentication middleware
- ✅ Models สำหรับ database access
- ✅ E2E Demo Script สำหรับทดสอบ full flow

### Key Files Added in Phase 6.1

| Category | Files |
|----------|-------|
| API Client | [`api-client.ts`](admin-ui/src/lib/api-client.ts), [`errors.ts`](admin-ui/src/lib/errors.ts) |
| SaaS Routes | [`connections.ts`](saas-api/src/routes/connections.ts), [`recommendations.ts`](saas-api/src/routes/recommendations.ts), [`executions.ts`](saas-api/src/routes/executions.ts), [`kill-switch.ts`](saas-api/src/routes/kill-switch.ts), [`audit.ts`](saas-api/src/routes/audit.ts) |
| SaaS Models | 6 model files ใน `saas-api/src/models/` |
| Auth | [`auth.ts`](saas-api/src/middleware/auth.ts) |
| Documentation | [`E2E_DEMO_SCRIPT.md`](admin-ui/docs/E2E_DEMO_SCRIPT.md) |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                   (Internal Admin)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │ Basic Auth
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Admin UI (Next.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Connections │ │Recommendations│ │ Executions │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐                            │
│  │ Kill Switch │ │   Audit     │                            │
│  └─────────────┘ └─────────────┘                            │
│                                                              │
│  └──────── API Client (fetch + x-api-secret) ────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ x-api-secret header
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SaaS API (Express.js)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Routes    │ │   Models    │ │ Middleware  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL Database                            │
│           (Production - Read/Write Operations)               │
└─────────────────────────────────────────────────────────────┘
```

UI พร้อมใช้งานเป็น control panel สำหรับ internal admins โดยยึดหลัก **human-in-the-loop** และ **safety-first** ทุก critical action ต้องผ่าน explicit confirmation พร้อม audit trail

**สำหรับการทดสอบ end-to-end flow โปรดดู:** [`E2E_DEMO_SCRIPT.md`](admin-ui/docs/E2E_DEMO_SCRIPT.md)
