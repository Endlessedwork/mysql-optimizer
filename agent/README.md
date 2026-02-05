# MySQL Production Optimizer Agent

Agent สำหรับ MySQL Production Optimizer SaaS ที่ช่วยให้สามารถสแกนและวิเคราะห์ฐานข้อมูล MySQL ได้อย่างปลอดภัย

## คุณสมบัติ

- รันในฝั่งลูกค้า (Docker friendly)
- ต่อ MySQL ด้วย read-only credential
- ดึงข้อมูล performance_schema / sys schema (query digest)
- ดึงข้อมูล tables / columns / indexes
- ดึงข้อมูล views / procedures / functions / triggers / events
- รัน EXPLAIN FORMAT=JSON สำหรับ top N queries
- มี safety:
  - allowlist เฉพาะ SELECT/SHOW/EXPLAIN
  - max_execution_time
  - throttling
- ส่งผลลัพธ์แบบ sanitized ไป SaaS API

## การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install
```

## การรัน

```bash
# รันใน development mode
npm run dev

# รันใน production mode
npm run build
npm start
```

## โครงสร้างโฟลเดอร์

```
agent/
├── src/
│   ├── index.ts          # Entry point
│   ├── agent.ts          # Main agent class
│   ├── config.ts         # Configuration management
│   ├── logger.ts         # Logging
│   ├── telemetry.ts      # Telemetry data collection
│   └── mysql-connector.ts # MySQL connection and query handling
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile
```

## การกำหนดค่า

สร้างไฟล์ `.env` จาก `.env.example` และปรับค่าตามความต้องการ

## ความปลอดภัย

- ใช้ read-only credential เท่านั้น
- อนุญาตเฉพาะคำสั่ง SELECT/SHOW/EXPLAIN เท่านั้น
- ตั้งค่า max_execution_time เพื่อป้องกันการรัน query นานเกินไป
- มี throttling เพื่อป้องกันการโหลดระบบ