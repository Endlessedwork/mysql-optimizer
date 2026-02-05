# Executor v1 - Canary Final Execution Checklist

## 1. Checklist ก่อนกดเริ่ม (Pre-Run)

### T-30 minutes: การเตรียมพร้อมระบบและทีม

- [ ] ตรวจสอบว่า environment ถูก reset/cleanup แล้ว
- [ ] ตรวจสอบว่า MySQL connection ทำงานได้จริง
- [ ] ตรวจสอบว่า SaaS API ทำงานได้จริง
- [ ] ตรวจสอบว่า Agent service ทำงานได้จริง
- [ ] ตรวจสอบว่า table size ไม่เกิน 5M rows
- [ ] ตรวจสอบว่า table size ไม่เกิน 10M rows (ถ้าเกินต้องได้รับ approval จาก DBA)
- [ ] ตรวจสอบว่า kill switch สามารถ toggle ได้จริง
- [ ] ตรวจสอบว่า kill switch API response time < 1 วินาที
- [ ] ตรวจสอบว่า kill switch dashboard สามารถเข้าถึงได้
- [ ] ตรวจสอบว่า DROP INDEX statement พร้อมใช้งาน
- [ ] ตรวจสอบว่า rollback ทดสอบใน test environment แล้ว
- [ ] ตรวจสอบว่า Canary Lead, DBA, SRE พร้อมทำงาน
- [ ] ตรวจสอบว่า communication channel (Slack/Teams) พร้อมใช้งาน
- [ ] ตรวจสอบว่า team เข้าใจ decision criteria
- [ ] ตรวจสอบว่า monitoring dashboard พร้อมใช้งาน
- [ ] ตรวจสอบว่า alert thresholds ถูกกำหนดแล้ว
- [ ] ตรวจสอบว่า baseline metrics ถูก record แล้ว
- [ ] ตรวจสอบว่า Canary Run Plan ถูก review แล้ว
- [ ] ตรวจสอบว่า Outcome Report template พร้อมใช้งาน

### T-10 minutes: การตรวจสอบขั้นสุดท้ายก่อน execute

- [ ] ตรวจสอบว่า integration test ผ่านทุกข้อ (P0 และ P1)
- [ ] ตรวจสอบว่า test result log ลงนามแล้ว
- [ ] ตรวจสอบว่า team ได้ briefed เรื่อง decision criteria
- [ ] ตรวจสอบว่า ทุกข้อใน checklist ถูกติ๊กครบ
- [ ] ตรวจสอบว่า ทุกข้อใน Go/No-Go checklist ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน pre-check checklist ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน environment readiness checklist ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน table size check ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน kill switch verification ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน rollback readiness ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน team readiness ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน monitoring readiness ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน documentation ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน final decision ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน sign-off ผ่าน

## 2. Step ระหว่างรัน (Execution Steps)

### Step 0: Announce Canary Start
- [ ] โพสต์ใน Slack channel พร้อม template ที่กำหนด
- [ ] ตรวจสอบว่า team ได้รับการแจ้งเตือนแล้ว

### Step 1: Final Pre-check
- [ ] ตรวจสอบ SaaS API health
- [ ] ตรวจสอบ kill switch ถูกปิด
- [ ] ตรวจสอบไม่มี execution ที่กำลังทำงาน
- [ ] ตรวจสอบ target table
- [ ] ตรวจสอบว่า Go/No-Go decision เป็น GO

### Step 2: Capture Baseline Metrics
- [ ] ตรวจสอบว่า baseline metrics ถูก record แล้ว
- [ ] ตรวจสอบว่า metrics ถูก capture สำเร็จ

### Step 3: Create execution_run
- [ ] สร้าง execution_run ผ่าน API
- [ ] ตรวจสอบว่า execution_run ถูกสร้างแล้ว
- [ ] ตรวจสอบว่า execution_run มี status 'scheduled'

### Step 4: Execute ADD_INDEX
- [ ] ตรวจสอบว่า index ถูกสร้างแล้ว
- [ ] ตรวจสอบว่า execution สำเร็จ
- [ ] ตรวจสอบว่า logs แสดงว่า index ถูกสร้างแล้ว

### Step 5: Monitoring Window
- [ ] ตรวจสอบว่า monitoring ทำงาน
- [ ] ตรวจสอบว่า metrics ถูก collect ทุก 15 นาที
- [ ] ตรวจสอบว่าไม่มี degradation ที่เกิน threshold

### Step 6: Collect After Metrics
- [ ] ตรวจสอบว่า after metrics ถูก record แล้ว
- [ ] ตรวจสอบว่า metrics ถูก collect สำเร็จ

### Step 7: Final Decision
- [ ] ตรวจสอบว่า decision ถูกตัดสินแล้ว
- [ ] ตรวจสอบว่า decision เป็น PASS, WARNING หรือ FAIL
- [ ] ดำเนินการตาม decision ที่ได้

### Step 8: Post-Execution Update
- [ ] ตรวจสอบว่า execution_run status ถูก update แล้ว
- [ ] ตรวจสอบว่า status เป็น completed

### Step 9: Announce Completion
- [ ] โพสต์ใน Slack channel พร้อม template ที่กำหนด
- [ ] ตรวจสอบว่า team ได้รับการแจ้งเตือนแล้ว

## 3. Abort Conditions

- [ ] ถ้า kill switch ถูก activate ทันที
- [ ] ถ้า latency P50 increase > 50%
- [ ] ถ้า latency P99 increase > 100%
- [ ] ถ้า lock wait time > 5 seconds
- [ ] ถ้า replication lag > 60 seconds
- [ ] ถ้า error rate > 1%
- [ ] ถ้า critical alert fired
- [ ] ถ้า table locked/unavailable
- [ ] ถ้า kill switch API failure (fail-closed)
- [ ] ถ้า ไม่มี kill switch API response time < 500ms

## 4. Post-run Verification Steps

- [ ] ตรวจสอบว่า execution_run status เป็น completed
- [ ] ตรวจสอบว่า index ถูกสร้างแล้ว
- [ ] ตรวจสอบว่า metrics ไม่แสดง degradation
- [ ] ตรวจสอบว่า no alerts fired
- [ ] ตรวจสอบว่า ทุกข้อใน pass/fail criteria ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน monitoring metrics ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน rollback decision flow ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน communication และ escalation ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน post-canary activities ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน final decision matrix ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน decision rules ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน rollback record template ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน post-canary report template ผ่าน
- [ ] ตรวจสอบว่า ทุกข้อใน lessons learned template ผ่าน