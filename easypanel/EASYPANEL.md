# Deploy บน EasyPanel

## ไฟล์ที่ใช้

| ไฟล์ | คำอธิบาย |
|------|----------|
| `docker-compose.easypanel.yml` | Compose file สำหรับ Easypanel (อยู่ที่ root) |
| `easypanel/.env.easypanel.example` | ตัวอย่าง environment variables |

## สิ่งที่ต้องมี

- Easypanel server พร้อมใช้งาน
- Git repository (หรือโคลนโปรเจกต์บนเซิร์ฟเวอร์)

## วิธี Deploy

### 1. สร้าง Compose App บน Easypanel

1. ไปที่ **Projects** → **Create Project** (หรือเลือก project ที่มี)
2. **Add Service** → **Docker Compose**
3. เลือก source:
   - **Git**: ใส่ URL ของ repo
   - **หรือ** mount โฟลเดอร์โปรเจกต์

### 2. ตั้งค่า Compose

- **Compose File**: `docker-compose.easypanel.yml`
- **Working Directory**: root ของโปรเจกต์

### 3. ตั้งค่า Environment Variables

คัดลอกค่าจาก `easypanel/.env.easypanel.example` แล้วแก้:

```bash
# ค่าที่ต้องเปลี่ยน (สำคัญ!)
POSTGRES_PASSWORD=your_strong_password
JWT_SECRET=your_jwt_secret_32_chars_min
API_SECRET=your_api_secret_32_chars_min
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
CORS_ORIGIN=https://your-ui-domain.com
```

> **สร้าง secrets แบบสุ่ม:**
> ```bash
> openssl rand -base64 32
> ```

### 4. ตั้งค่า Domain

#### API Service (`saas-api`)
- Port: `3001`
- Domain: เช่น `api.yourdomain.com`

#### Admin UI (`admin-ui`)
- Port: `3000`
- Domain: เช่น `app.yourdomain.com`

### 5. Deploy

1. กด **Deploy** หรือ **Start**
2. รอ services เริ่มต้น (postgres → saas-api → admin-ui)
3. เช็ค logs ถ้ามีปัญหา

## Services ที่รัน

| Service | Port | คำอธิบาย |
|---------|------|----------|
| `postgres` | 5432 (internal) | PostgreSQL database |
| `saas-api` | 3001 | REST API |
| `admin-ui` | 3000 | Web dashboard |

## หมายเหตุสำคัญ

### NEXT_PUBLIC_API_BASE_URL
- ค่านี้ถูก **bake ตอน build** ใน Next.js
- ถ้าเปลี่ยนค่าต้อง **rebuild admin-ui image**
- ต้องเป็น URL ที่ browser เข้าถึงได้ (ไม่ใช่ internal URL)

### Database Persistence
- Data เก็บใน volume `postgres_data`
- ไม่หายแม้ restart containers

### ไม่รวม Agent
- Compose นี้ไม่มี Agent
- ถ้าต้องการ Agent ให้ deploy แยก หรือแก้ compose เพิ่ม

## Troubleshooting

### API ไม่ตอบ
```bash
# เช็ค logs
docker compose -f docker-compose.easypanel.yml logs saas-api
```

### Database connection failed
- เช็คว่า postgres healthy แล้วหรือยัง
- เช็ค POSTGRES_PASSWORD ตรงกันทุก service

### CORS error ใน browser
- เช็คว่า `CORS_ORIGIN` ตรงกับ URL ของ admin-ui
- หรือใช้ `CORS_ORIGIN=*` ชั่วคราว

### Admin UI ไม่เรียก API
- เช็คว่า `NEXT_PUBLIC_API_BASE_URL` ถูกต้อง
- ต้อง rebuild admin-ui หลังเปลี่ยนค่า

## เพิ่ม Agent (Optional)

ถ้าต้องการเพิ่ม Agent ให้แก้ `docker-compose.easypanel.yml`:

```yaml
  agent:
    build:
      context: ./agent
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    environment:
      NODE_ENV: production
      AGENT_MODE: both
      API_URL: http://saas-api:3001
      API_KEY: ${API_SECRET}
      TENANT_ID: ${TENANT_ID}
      AGENT_ID: agent-prod-1
      DB_HOST: ${MYSQL_TARGET_HOST}
      DB_PORT: ${MYSQL_TARGET_PORT:-3306}
      DB_USER: ${MYSQL_TARGET_USER}
      DB_PASSWORD: ${MYSQL_TARGET_PASSWORD}
      DB_DATABASE: ${MYSQL_TARGET_DATABASE}
    depends_on:
      saas-api:
        condition: service_healthy
    networks:
      - optimizer-network
```

และเพิ่ม env variables ใน Easypanel:
```
MYSQL_TARGET_HOST=your-mysql-server.com
MYSQL_TARGET_PORT=3306
MYSQL_TARGET_USER=optimizer
MYSQL_TARGET_PASSWORD=mysql_password
MYSQL_TARGET_DATABASE=your_database
```
