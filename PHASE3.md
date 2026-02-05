Step 3.1 — Query Analyzer + Index Advisor

Goal: แปลง raw data → insight ที่เชื่อถือได้
Output: โมดูลวิเคราะห์

ช่วยสร้าง Query Analyzer สำหรับ MySQL Production Optimizer

อินพุต:
- query digests
- explain plans (JSON)
- schema/index snapshot

ต้องวิเคราะห์:
- full table scan
- filesort / temp table
- rows examined vs rows returned
- index usage / missing index / redundant index
- join order issues

เอาต์พุต:
- ปัญหาที่ตรวจพบ (พร้อมหลักฐาน)
- คำแนะนำในการแก้ไข
- expected improvement
- trade-offs (write cost, disk, lock risk)

ออกแบบเป็น rule-based engine ที่เพิ่ม rule ได้ง่าย


Step 3.2 — Impact Analysis (กันแก้แล้วพัง)

Goal: รู้ว่าแก้แล้วกระทบอะไรบ้าง
Output: blast radius ต่อ recommendation

ช่วยออกแบบ Impact Analysis สำหรับ MySQL Optimizer

ต้องทำ:
- ตรวจ dependency จาก:
  - views
  - procedures
  - functions
  - triggers
  - events
  - foreign keys
- map table/column -> objects ที่อ้างถึง
- ใช้ query patterns จาก digest เพื่อบอกว่า column ไหนถูกใช้งานบ่อย

ผลลัพธ์:
- blast radius ต่อ recommendation
- risk score (low/medium/high)
- confidence level

ไม่ต้องรู้ถึงโค้ดแอป


Step 3.3 — Recommendation Pack Generator

Goal: ให้ user ตัดสินใจได้ก่อนแก้จริง
Output: เอกสาร proposal ต่อ issue

ช่วยออกแบบ Recommendation Pack สำหรับ MySQL Production Optimizer

1 recommendation ต้องมี:
- problem statement
- evidence (metrics + explain)
- blast radius
- fix options (A/B/C)
- expected gain
- risk & trade-offs
- rollback plan
- verification plan

รูปแบบเอาต์พุต:
- JSON structure ที่พร้อมเอาไปใช้ใน UI

