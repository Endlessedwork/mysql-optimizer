PHASE 1 — ออกแบบระบบ (Blueprint)
Step 1.1 — สั่ง AI ออกแบบ Architecture ทั้งระบบ

Goal: ให้ทุกอย่างชัดก่อนเขียนโค้ด
Output: Architecture diagram (เชิงข้อความ), data flow, component list

ช่วยออกแบบสถาปัตยกรรม (Architecture Blueprint) สำหรับ SaaS
ชื่อระบบ: MySQL Production Optimizer

เงื่อนไข:
- SaaS multi-tenant
- ใช้ Agent แบบ outbound-only ในฝั่งลูกค้า
- Agent ต่อ MySQL ด้วย read-only credential
- SaaS รับเฉพาะผลสรุป/telemetry (ไม่ inbound เข้า DB ลูกค้า)
- แยก phase:
  1) Discover/Analyze (read-only)
  2) Execute (เฉพาะ approved)

ให้ส่งออก:
1) รายชื่อ component ทั้งหมด
2) หน้าที่ของแต่ละ component
3) Data flow ระหว่าง Agent → SaaS
4) จุดที่ต้องระวังด้าน security
5) สิ่งที่ “ห้ามทำเด็ดขาด” ใน production

ใช้ข้อความอธิบาย (ไม่ต้องวาดรูป)


Step 1.2 — ออกแบบ Database (metadata DB ของ SaaS)

Goal: รู้ว่าระบบเราต้องเก็บอะไรบ้าง
Output: schema สำหรับ Postgres

ช่วยออกแบบ Database Schema (PostgreSQL) สำหรับ SaaS
ชื่อระบบ: MySQL Production Optimizer

ต้องรองรับ:
- multi-tenant
- connection profiles (ไม่เก็บ password plaintext)
- scan runs
- schema/index snapshot
- query digest + explain plans
- recommendation packs
- approval workflow
- execution history
- verification (before/after metrics)
- audit logs

ขอ:
1) รายชื่อตารางทั้งหมด
2) คอลัมน์สำคัญ
3) ความสัมพันธ์ระหว่างตาราง
4) เหตุผลสั้นๆ ของแต่ละตาราง

ยังไม่ต้องเขียน SQL
