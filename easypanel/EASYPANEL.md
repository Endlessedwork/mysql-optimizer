# Deploy บน EasyPanel

## สิ่งที่ต้องมี

- โปรเจกต์นี้โคลนบนเซิร์ฟเวอร์ที่ติดตั้ง EasyPanel แล้ว
- พอร์ต 5432, 3001, 3050 พร้อมใช้ (หรือใช้ reverse proxy/domain แทน)

## วิธี Deploy แบบ Compose

1. **เพิ่ม Compose App**
   - ใน EasyPanel ไปที่ Apps → Create → Compose
   - ชี้ source ไปที่โฟลเดอร์โปรเจกต์ (หรืออัปโหลด/เชื่อม Git)
   - ใช้ไฟล์ `docker-compose.yml` ที่อยู่ที่ **root ของโปรเจกต์** (ไม่ใช่ใน easypanel/)

2. **ตั้งค่า Environment**
   - คัดลอก `easypanel/.env.easypanel.example` เป็น `.env` ที่ root โปรเจกต์
   - แก้ค่าตามจริง โดยเฉพาะ:
     - `POSTGRES_PASSWORD`, `JWT_SECRET`, `API_SECRET`, `ADMIN_PASSWORD`
     - **`NEXT_PUBLIC_API_BASE_URL`** = URL สาธารณะของ API ที่เบราว์เซอร์เรียกได้ (เช่น `https://api.yourdomain.com`)
   - ใน EasyPanel ใส่ env variables ตามที่ใช้ได้ (หรืออัปโหลดไฟล์ .env ถ้ารองรับ)

3. **Build และรัน**
   - สั่ง Deploy/Build
   - รอ postgres healthy แล้ว saas-api แล้ว admin-ui ตามลำดับ

4. **โดเมน/HTTPS**
   - ผูกโดเมนกับ service `admin-ui` (พอร์ต 3050) สำหรับหน้าแอดมิน
   - ผูกโดเมนกับ service `saas-api` (พอร์ต 3001) สำหรับ API
   - หลังผูกโดเมนแล้ว ต้องตั้ง `NEXT_PUBLIC_API_BASE_URL` ให้ชี้ไปที่ URL ของ API (เช่น `https://api.yourdomain.com`) แล้ว **build admin-ui ใหม่** เพราะ Next.js bake ค่านี้ตอน build

## โครงสร้างที่ EasyPanel จะรัน

- **postgres** – ใช้ volume `postgres_data` เก็บข้อมูล
- **saas-api** – build จาก `saas-api/`, รัน migrations ผ่าน entrypoint/startup ถ้ามี
- **admin-ui** – build จาก `admin-ui/` โดยรับ `NEXT_PUBLIC_API_BASE_URL` เป็น build-arg

## หมายเหตุ

- ครั้งแรกที่รัน schema ถูกสร้างจาก `database_schema.sql` และ migrations ใน `saas-api/migrations/`
- ถ้าเปลี่ยน `NEXT_PUBLIC_API_BASE_URL` ต้อง rebuild image ของ admin-ui
- ดูภาพรวมระบบใน `OVERVIEW.md` ที่ root โปรเจกต์
