# MySQL Production Optimizer - SaaS API (Control Plane)

## Overview
SaaS API สำหรับ MySQL Production Optimizer ที่ใช้ Fastify + TypeScript ควบคุมระบบทั้งหมด รวมถึงการจัดการการอนุมัติและ audit trail

## คุณสมบัติหลัก

### Authentication & Authorization
- JWT-based authentication
- Role-Based Access Control (RBAC)
- บทบาท: viewer / approver / admin

### CRUD Operations
- จัดการ connection profiles
- จัดการ scan runs
- จัดการ recommendations
- จัดการ audit logs

### Approval Workflow
- อนุมัติ recommendation
- กำหนดเวลา execute recommendation
- ระบบ webhook/queue trigger สำหรับ agent

## โครงสร้างโปรเจกต์

```
saas-api/
├── src/
│   ├── index.ts          # Entry point
│   ├── database.ts       # Database connection (MongoDB)
│   ├── auth.ts           # Authentication middleware
│   ├── rbac.ts           # RBAC implementation
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   ├── connections.routes.ts
│   │   ├── scans.routes.ts
│   │   ├── recommendations.routes.ts
│   │   ├── audit.routes.ts
│   │   └── webhook.routes.ts
│   ├── middleware/       # Custom middleware
│   │   ├── auth.middleware.ts
│   │   └── rbac.middleware.ts
│   └── models/           # Data models
│       ├── user.model.ts
│       ├── connection.model.ts
│       ├── scan.model.ts
│       ├── recommendation.model.ts
│       └── audit.model.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## ตัวอย่าง Endpoint

### Authentication
```
POST /auth/login
POST /auth/register
```

### Connections
```
GET /connections
GET /connections/:id
POST /connections
PUT /connections/:id
DELETE /connections/:id
```

### Scans
```
GET /scans
GET /scans/:id
POST /scans
```

### Recommendations
```
GET /recommendations
GET /recommendations/:id
POST /recommendations/:id/approve
POST /recommendations/:id/schedule
```

### Audit Logs
```
GET /audit
GET /audit/:id
```

### Webhooks
```
POST /webhook/agent
```

## Middleware ด้าน Security

### Authentication Middleware
- ตรวจสอบ JWT token
- ตรวจสอบ validity ของ token
- ตรวจสอบ user role

### RBAC Middleware
- ตรวจสอบสิทธิ์การเข้าถึงตาม role
- ควบคุมการเข้าถึง endpoint ตามบทบาท
- ตรวจสอบ permission สำหรับแต่ละ operation

## ความปลอดภัย

- ใช้ JWT สำหรับ authentication
- ใช้ RBAC สำหรับ authorization
- บันทึก audit trail ทุก action
- ใช้ HTTPS สำหรับการสื่อสาร
- ป้องกัน SQL injection และ XSS