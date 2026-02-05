# Executor v1 - Canary Go/No-Go Checklist

> ⚠️ **คำเตือน:** ต้องติ๊กครบทุกข้อก่อนกดเริ่ม Canary จริง
> หากมีข้อใดไม่ผ่าน → **ห้ามเริ่ม Canary**

## Canary Run Information
| Item | Value |
|------|-------|
| Planned Date | [กรอกวันที่] |
| Planned Time (Off-peak) | [กรอกเวลา] |
| Canary Lead | [กรอกชื่อ] |
| Target Tenant | [กรอก tenant ID] |
| Target Table | [กรอก table name] |
| Target Index | [กรอก index name/DDL] |

---

## ✅ Pre-Canary Go/No-Go Checklist

### Section A: Integration Test Results
- [ ] TC-02 (Kill Switch Immediate Stop) **PASSED**
- [ ] TC-09 (Kill Switch During Execution) **PASSED**
- [ ] TC-03 (Kill Switch Recovery) **PASSED**
- [ ] TC-01 (Single Execution Lock) **PASSED**
- [ ] TC-06 (Verification Detects Success) **PASSED**
- [ ] ≥80% ของ P1 tests (TC-01, TC-06) ผ่าน
- [ ] Integration Test Result Log ลงนามแล้ว

### Section B: Environment Readiness
- [ ] Test environment ถูก reset/cleanup แล้ว
- [ ] MySQL connection ทดสอบแล้ว (ใช้ target credentials)
- [ ] SaaS API health check ผ่าน
- [ ] Agent service running และ healthy

### Section C: Table Size Check (NEW)
- [ ] ตรวจสอบ row count ของ target table แล้ว
- [ ] Row count ≤ 5M rows → **PASS**
- [ ] ถ้า Row count > 5M และ ≤ 10M → มี DBA approval
- [ ] ถ้า Row count > 10M → **BLOCK - ห้ามดำเนินการ**

**Table Size Verification:**
```sql
SELECT TABLE_ROWS FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = '[database]' AND TABLE_NAME = '[table]';
```
Result: _____________ rows

### Section D: Kill Switch Verification
- [ ] Kill switch toggle ทดสอบแล้ว (enable → disable → enable)
- [ ] Kill switch API response time < 1 วินาที
- [ ] Kill switch dashboard accessible

### Section E: Rollback Readiness
- [ ] DROP INDEX statement พร้อมแล้ว
- [ ] Rollback ทดสอบใน test environment แล้ว
- [ ] Estimated rollback time: _______ minutes

### Section F: Team Readiness
- [ ] Canary Lead available ตลอด canary window
- [ ] DBA on-call confirmed
- [ ] SRE on-call confirmed
- [ ] Communication channel (Slack/Teams) พร้อม
- [ ] Team briefed เรื่อง decision criteria

### Section G: Monitoring Readiness
- [ ] Grafana/monitoring dashboard พร้อม
- [ ] Alert thresholds configured
- [ ] Baseline metrics recorded (ก่อน canary)

### Section H: Documentation
- [ ] Canary Run Plan reviewed
- [ ] Decision Rules understood by team
- [ ] Outcome Report template ready

---

## Final Go/No-Go Decision

| Checklist Complete | Decision |
|--------------------|----------|
| ✅ ทุกข้อใน A-H ผ่าน | **GO** - เริ่ม Canary ได้ |
| ❌ มีข้อใดไม่ผ่าน | **NO-GO** - ห้ามเริ่ม, แก้ไขก่อน |

### Sign-off

| Role | Name | Date/Time | Signature |
|------|------|-----------|-----------|
| Canary Lead | | | ⬜ APPROVED |
| DBA | | | ⬜ APPROVED |
| Tech Lead | | | ⬜ APPROVED |

---

**เมื่อได้ GO:**
1. ถ่ายภาพหน้าจอ checklist นี้
2. แนบกับ Canary Run Outcome Report
3. เริ่ม Canary ตาม plan

**เมื่อได้ NO-GO:**
1. บันทึกข้อที่ไม่ผ่านและเหตุผล
2. กำหนด action items สำหรับแก้ไข
3. กำหนดวันทดลองใหม่