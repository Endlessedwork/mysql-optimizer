# ภาพรวมระบบ MySQL Production Optimizer

## องค์ประกอบหลัก

| ส่วน | โฟลเดอร์ | หน้าที่ |
|------|----------|--------|
| **PostgreSQL** | - | เก็บข้อมูล tenant, connections, recommendations, executions, kill-switch, audit |
| **SaaS API** | `saas-api/` | REST API สำหรับ Admin UI และ Agent, auth, migrations |
| **Admin UI** | `admin-ui/` | เว็บจัดการ connections, recommendations, executions, kill-switch |
| **Agent** | `agent/` | (ตัวเลือก) สแกน MySQL เป้าหมาย ส่งข้อมูลเข้า API |

## สิ่งที่ต้องมีเพื่อรันระบบ

### 1. ฐานข้อมูล
- **PostgreSQL 16+**  
- Schema มาจาก `database_schema.sql` และ migrations ใน `saas-api/migrations/`  
- ตัวแปร: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

### 2. SaaS API
- Node 20, พอร์ต 3001  
- ต้องมี: `DATABASE_URL`, `JWT_SECRET`, `API_SECRET`  
- Health: `GET /health`

### 3. Admin UI
- Next.js 14, พอร์ต 3050  
- ต้องมี: `NEXT_PUBLIC_API_BASE_URL` (URL สาธารณะของ API ที่เบราว์เซอร์เรียกได้), `API_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`  
- Login ใช้ Basic auth กับ API

### 4. Agent (ถ้าใช้)
- ต่อกับ MySQL เป้าหมาย (read-only) และเรียก SaaS API  
- ต้องมี: `API_URL`, `API_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`

## พอร์ตที่ใช้

| Service   | พอร์ต (default) |
|----------|------------------|
| PostgreSQL | 5432 |
| SaaS API   | 3001 |
| Admin UI   | 3050 |

## ความปลอดภัยที่ต้องตั้งค่า

- `JWT_SECRET`, `API_SECRET` ความยาวอย่างน้อย 32 ตัวอักษร  
- `ADMIN_PASSWORD` แข็งแรง  
- `POSTGRES_PASSWORD` ไม่ใช้ค่า default ใน production  
- Production ควรใช้ HTTPS และไม่ expose PostgreSQL ตรงออกอินเทอร์เน็ต

## โครงสร้างข้อมูล (สรุป)

- **tenants** – multi-tenant  
- **connection_profiles** – การเชื่อมต่อ MySQL (password เข้ารหัส)  
- **scan_runs**, **schema_snapshots**, **query_digests** – ผลสแกน  
- **recommendation_packs** – คำแนะนำการปรับปรุง  
- **executions** – การรัน/rollback  
- **kill_switch** – ปิดการรันคำสั่งทั้งระบบ  
- **audit** – บันทึกการดำเนินการ

รายละเอียด schema เต็มใน `database_schema.sql` และ `saas-api/migrations/`.
