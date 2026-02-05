# PHASE 4 - Control Plane & UI

## 4.1 SaaS API (Control Plane)

### Overview
สร้าง SaaS API สำหรับควบคุมระบบ MySQL Production Optimizer ด้วย Fastify + TypeScript ที่มีฟีเจอร์ครบครันสำหรับการจัดการและอนุมัติการปรับปรุง

### คุณสมบัติหลัก
- **Authentication & RBAC**: ระบบ authentication ด้วย JWT และ Role-Based Access Control พร้อมบทบาท viewer / approver / admin
- **CRUD Operations**: จัดการ connection profiles, scan runs, recommendations อย่างครบถ้วน
- **Approval Workflow**: ระบบอนุมัติคำแนะนำและกำหนดเวลา execute
- **Audit Logging**: บันทึก audit trail ทุก action สำหรับการติดตาม
- **Webhook/Queue Trigger**: ระบบ webhook/queue สำหรับสั่งให้ agent ทำงาน

### โครงสร้างโปรเจกต์
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

### ตัวอย่าง Endpoint
- **Authentication**: POST /auth/login, POST /auth/register
- **Connections**: GET/POST/PUT/DELETE /connections
- **Scans**: GET/POST /scans
- **Recommendations**: GET/POST/PUT /recommendations, POST /recommendations/:id/approve, POST /recommendations/:id/schedule
- **Audit Logs**: GET /audit
- **Webhooks**: POST /webhook/agent

### Middleware ด้าน Security
- **Authentication Middleware**: ตรวจสอบ JWT token และ validity
- **RBAC Middleware**: ตรวจสอบสิทธิ์การเข้าถึงตาม role และ permission

## 4.2 Dashboard (Next.js)

### Overview
สร้าง Dashboard UI สำหรับ MySQL Production Optimizer ด้วย Next.js เพื่อให้ผู้ใช้สามารถตรวจสอบและจัดการการปรับปรุงฐานข้อมูลได้อย่างมีประสิทธิภาพ

### หน้าที่มีอยู่
1. **Connections** - จัดการ connection profiles
2. **Scan runs** - แสดงผลการสแกนฐานข้อมูล
3. **Query Explorer** - สำรวจ query ที่พบ
4. **Recommendation detail + approve** - แสดงรายละเอียดคำแนะนำและอนุมัติ
5. **Timeline/Audit** - แสดง audit trail และประวัติการดำเนินการ

### UX สำหรับ Production
- **อ่านง่าย**: แสดงข้อมูลอย่างชัดเจน
- **เตือนความเสี่ยง**: แสดงระดับความเสี่ยงของแต่ละคำแนะนำ
- **Before/After Comparison**: แสดงผลลัพธ์ก่อนและหลังการปรับปรุง

### โครงสร้างโปรเจกต์
```
dashboard/
├── pages/
│   ├── index.tsx         # Home page
│   ├── connections/
│   │   └── index.tsx     # Connection management
│   ├── scans/
│   │   └── index.tsx     # Scan runs
│   ├── queries/
│   │   └── index.tsx     # Query explorer
│   ├── recommendations/
│   │   ├── index.tsx     # Recommendation list
│   │   └── [id]/index.tsx # Recommendation detail
│   └── audit/
│       └── index.tsx     # Audit timeline
├── components/
│   ├── layout/
│   │   └── Header.tsx    # Header component
│   ├── connections/
│   │   └── ConnectionForm.tsx # Connection form
│   ├── recommendations/
│   │   ├── RecommendationCard.tsx # Recommendation card
│   │   └── ApprovalModal.tsx # Approval modal
│   ├── charts/
│   │   └── PerformanceChart.tsx # Performance visualization
│   └── ui/
│       ├── Alert.tsx     # Alert component
│       ├── Table.tsx     # Data table
│       └── Button.tsx    # Button component
├── styles/
│   └── globals.css       # Global styles
├── lib/
│   └── api.ts            # API client
└── public/
    └── images/           # Static assets
```

### เทคโนโลยีที่ใช้
- Next.js สำหรับ framework
- React สำหรับ UI components
- Styled Components สำหรับ styling
- Recharts สำหรับ visualization
- Axios สำหรับ API calls
- TypeScript สำหรับ type safety

### ความปลอดภัย
- ต้องมี authentication สำหรับเข้าถึง
- ควบคุมสิทธิ์ตาม role (viewer/approver/admin)
- บันทึก audit trail ทุก action
- ป้องกัน XSS และ CSRF