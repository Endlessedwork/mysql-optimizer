# รันระบบแบบ Local

## ภาพรวมระบบ (จาก OVERVIEW.md)

| ส่วน | โฟลเดอร์ | หน้าที่ | พอร์ต |
|------|----------|--------|--------|
| **PostgreSQL** | - | เก็บ tenants, connections, recommendations, executions, kill-switch, audit | 5432 |
| **SaaS API** | `saas-api/` | REST API สำหรับ Admin UI และ Agent, auth, migrations | 3001 |
| **Admin UI** | `admin-ui/` | เว็บจัดการ connections, recommendations, executions, kill-switch | 3050 |
| **Agent** | `agent/` | (ตัวเลือก) สแกน MySQL เป้าหมาย ส่งข้อมูลเข้า API | - |

ลำดับการทำงาน: Admin UI → SaaS API → PostgreSQL. Agent (ถ้าใช้) ต่อ MySQL เป้าหมายและเรียก SaaS API.

---

## วิธีที่ 1: รันด้วย Docker Compose (แนะนำ)

**ต้องมี:** Docker และ Docker Compose ติดตั้งแล้ว

```bash
# อยู่ที่ root โปรเจกต์
cd /Users/alone/AiCode/mysql-optimizer

# มี .env อยู่แล้ว (สร้างจาก .env.docker.example)
# แก้รหัสผ่านใน .env ถ้าต้องการ: POSTGRES_PASSWORD, ADMIN_PASSWORD, JWT_SECRET, API_SECRET

docker compose up -d --build
```

จากนั้น:
- Admin UI: http://localhost:3050  
- API: http://localhost:3001 (health: http://localhost:3001/health)  
- Login Admin: ใช้ `ADMIN_USERNAME` / `ADMIN_PASSWORD` จาก `.env`

หยุดระบบ:
```bash
docker compose down
```

---

## วิธีที่ 2: รันแบบไม่ใช้ Docker (Node + PostgreSQL บนเครื่อง)

**ต้องมี:** Node 20, PostgreSQL 16+ (ติดตั้งและรันอยู่แล้ว)

### 1) สร้าง DB และ schema

```bash
# สร้าง database และ user (รันใน psql หรือใช้ GUI)
createdb mysql_optimizer
# หรือใน psql: CREATE DATABASE mysql_optimizer;

# โหลด schema หลัก
psql -U postgres -d mysql_optimizer -f database_schema.sql
```

### 2) ตั้งค่าและรัน SaaS API

```bash
cd saas-api
cp .env.example .env
# แก้ .env: DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/mysql_optimizer
# และตั้ง API_SECRET, JWT_SECRET ความยาวอย่างน้อย 32 ตัวอักษร

npm install
node scripts/migrate.js
npm run dev
```

รันไว้ในเทอร์มินัลหนึ่ง (พอร์ต 3001)

### 3) ตั้งค่าและรัน Admin UI

```bash
cd admin-ui
cp .env.example .env.local
# แก้ .env.local: NEXT_PUBLIC_API_BASE_URL=http://localhost:3001, API_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD

npm install
PORT=3050 npm run dev
```

เปิดเบราว์เซอร์ที่ http://localhost:3050

---

## สถานะปัจจุบัน

- ไฟล์ `.env` ที่ root ถูกสร้างจาก `.env.docker.example` แล้ว (สำหรับ Docker)
- ถ้ายังไม่มี Docker: ติดตั้ง Docker Desktop (หรือ Docker Engine + Compose) แล้วรัน `docker compose up -d --build`
- ถ้าเลือกรันแบบไม่ใช้ Docker: ติดตั้ง PostgreSQL แล้วทำตามวิธีที่ 2
- Docker: SaaS API ใช้ `HOST=0.0.0.0` เพื่อให้รับการเชื่อมต่อจาก port forward ได้
- ถ้าหน้า Kill Switch error (ตารางไม่มี): สร้างตารางด้วย SQL ใน `saas-api/migrations/002_add_kill_switch.sql` (PostgreSQL) หรือรัน `node saas-api/scripts/migrate.js` จาก host โดยให้ `DATABASE_URL` ชี้ไปที่ Postgres
