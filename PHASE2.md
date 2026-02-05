PHASE2.md
PHASE 2 — Agent (หัวใจของระบบ)
Step 2.1 — สร้าง Agent (Read-only Scanner)

Goal: ดึงของจริงจาก production DB แบบปลอดภัย
Output: Repo agent ที่รันได้จริง

ช่วยสร้าง Agent (Node.js + TypeScript) สำหรับ MySQL Production Optimizer

Agent ทำหน้าที่:
- รันในฝั่งลูกค้า (Docker friendly)
- ต่อ MySQL ด้วย read-only credential
- ดึงข้อมูล:
  - performance_schema / sys schema (query digest)
  - tables / columns / indexes
  - views / procedures / functions / triggers / events
- รัน EXPLAIN FORMAT=JSON สำหรับ top N queries
- มี safety:
  - allowlist เฉพาะ SELECT/SHOW/EXPLAIN
  - max_execution_time
  - throttling
- ส่งผลลัพธ์แบบ sanitized ไป SaaS API

ขอ:
1) โครงสร้างโฟลเดอร์
2) ไฟล์หลัก (entrypoint)
3) MySQL connector
4) ตัวอย่าง config (yaml หรือ env)
5) README วิธีรัน
