# Integration Test Result Log - Executor v1

> **เอกสารนี้ใช้สำหรับบันทึกผลการรัน Integration Tests จริงของ Executor v1**  
> **อ้างอิง:** [`EXECUTOR_V1_INTEGRATION_TEST_CHECKLIST.md`](EXECUTOR_V1_INTEGRATION_TEST_CHECKLIST.md) | [`EXECUTOR_V1_INTEGRATION_TEST_PLAN.md`](EXECUTOR_V1_INTEGRATION_TEST_PLAN.md)

---

## 1. Test Run Information

### 1.1 รายละเอียดการทดสอบ

| Field | Value |
|-------|-------|
| **Test Run ID** | _(กรอกตอนเริ่มทดสอบ)_ |
| **วันที่ทดสอบ** | _(YYYY-MM-DD)_ |
| **เวลาเริ่ม** | _(HH:MM UTC+7)_ |
| **เวลาสิ้นสุด** | _(HH:MM UTC+7)_ |
| **ผู้ทดสอบ** | _(ชื่อผู้ทดสอบ)_ |
| **Reviewer** | _(ชื่อ reviewer ถ้ามี)_ |

### 1.2 Environment Information

| Component | Version / Details |
|-----------|-------------------|
| **MySQL Server** | _(เช่น 8.0.35)_ |
| **Node.js** | _(เช่น 18.19.0)_ |
| **SaaS API** | _(commit hash หรือ version)_ |
| **Agent** | _(commit hash หรือ version)_ |
| **Test Database** | _(database name)_ |
| **OS** | _(เช่น Ubuntu 22.04)_ |

### 1.3 Pre-Test Checklist

> ✅ ต้องผ่านทุกข้อก่อนเริ่มทดสอบ

| # | Item | Status |
|---|------|--------|
| 1 | SaaS API running และ accessible | ⬜ Done / ⬜ N/A |
| 2 | MySQL test database พร้อมใช้งาน | ⬜ Done / ⬜ N/A |
| 3 | Test data (test_orders) ถูกสร้างแล้ว | ⬜ Done / ⬜ N/A |
| 4 | Environment variables ถูกต้อง | ⬜ Done / ⬜ N/A |
| 5 | Log level ตั้งเป็น DEBUG | ⬜ Done / ⬜ N/A |
| 6 | Kill switch ถูก reset เป็น inactive | ⬜ Done / ⬜ N/A |
| 7 | ไม่มี execution_run ค้างอยู่ | ⬜ Done / ⬜ N/A |
| 8 | Worker instances พร้อมรัน | ⬜ Done / ⬜ N/A |

**Pre-Test Notes:**
```
(บันทึกสิ่งที่ต้องระวังหรือ setup พิเศษ)
```

---

## 2. Test Results - Detailed Log

### ตารางสรุปผลการทดสอบ

| TC ID | Test Name | Actual Behavior | execution_run Status | Log Ref / Timestamp | Result | Notes |
|-------|-----------|-----------------|----------------------|---------------------|--------|-------|
| TC-01 | Worker Claim Conflict | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-02 | Kill Switch Before Start | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-03 | Kill Switch After ADD INDEX | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-04 | LOCK=NONE Not Supported | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-05 | Index Already Exists | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-06 | Verification Fail + Rollback OK | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-07 | Verification Fail + Rollback Fail | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-08 | Low Sample - Inconclusive | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-09 | Kill Switch API Failure | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |
| TC-10 | Worker Crash + Lease Expiry | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | _(กรอกตอนทดสอบ)_ | ⬜ Pass / ⬜ Fail | |

---

### 2.1 TC-01: Worker Claim Conflict

**Description:** Worker 2 ตัว claim execution_run เดียวกัน → ต้องรันได้ตัวเดียว

| Field | Expected | Actual |
|-------|----------|--------|
| Worker 1 HTTP Response | 200 OK | _(กรอกตอนทดสอบ)_ |
| Worker 2 HTTP Response | 409 Conflict | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | COMPLETED | _(กรอกตอนทดสอบ)_ |
| Only 1 worker executed | Yes | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- Query ที่ใช้ตรวจสอบ
SELECT id, status, claimed_by, claimed_at FROM execution_runs WHERE id = 'test-tc01-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม)
```

---

### 2.2 TC-02: Kill Switch Before Start

**Description:** Kill switch เปิดก่อนเริ่ม → abort

| Field | Expected | Actual |
|-------|----------|--------|
| Kill switch detected | Yes | _(กรอกตอนทดสอบ)_ |
| Index created | No | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | FAILED | _(กรอกตอนทดสอบ)_ |
| fail_reason | kill_switch | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- Query ที่ใช้ตรวจสอบ
SELECT id, status, fail_reason FROM execution_runs WHERE id = 'test-tc02-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม)
```

---

### 2.3 TC-03: Kill Switch After ADD INDEX

**Description:** Kill switch เปิดหลัง ADD INDEX ก่อน verify → rollback

| Field | Expected | Actual |
|-------|----------|--------|
| ADD INDEX successful | Yes | _(กรอกตอนทดสอบ)_ |
| Kill switch detected after ADD | Yes | _(กรอกตอนทดสอบ)_ |
| Rollback executed | Yes | _(กรอกตอนทดสอบ)_ |
| Index exists after rollback | No | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | ROLLED_BACK | _(กรอกตอนทดสอบ)_ |
| fail_reason | kill_switch | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Kill Switch Activated At:** _(HH:MM:SS)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- ตรวจสอบ index
SHOW INDEX FROM test_orders WHERE Key_name = 'idx_tc03_date';

-- ตรวจสอบ execution status
SELECT id, status, fail_reason FROM execution_runs WHERE id = 'test-tc03-001';

-- ตรวจสอบ rollback record
SELECT * FROM rollbacks WHERE execution_run_id = 'test-tc03-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม)
```

---

### 2.4 TC-04: LOCK=NONE Not Supported

**Description:** MySQL ไม่รองรับ LOCK=NONE → mark requires_manual

| Field | Expected | Actual |
|-------|----------|--------|
| MySQL error detected | Error 1846 หรือ similar | _(กรอกตอนทดสอบ)_ |
| Index created | No | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | REQUIRES_MANUAL | _(กรอกตอนทดสอบ)_ |
| fail_reason | execution_error | _(กรอกตอนทดสอบ)_ |
| Error message recorded | Yes | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- Query ที่ใช้ตรวจสอบ
SELECT id, status, fail_reason, error_message FROM execution_runs WHERE id = 'test-tc04-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม)
```

---

### 2.5 TC-05: Index Already Exists

**Description:** Index มีอยู่แล้ว → abort

| Field | Expected | Actual |
|-------|----------|--------|
| Duplicate key error detected | Error 1061 | _(กรอกตอนทดสอบ)_ |
| Execution aborted | Yes | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | FAILED | _(กรอกตอนทดสอบ)_ |
| fail_reason | execution_error | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- Query ที่ใช้ตรวจสอบ
SELECT id, status, fail_reason FROM execution_runs WHERE id = 'test-tc05-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม)
```

---

### 2.6 TC-06: Verification Fail with Rollback Success

**Description:** Verification fail → rollback success

| Field | Expected | Actual |
|-------|----------|--------|
| ADD INDEX successful | Yes | _(กรอกตอนทดสอบ)_ |
| Verification detected degradation | Yes | _(กรอกตอนทดสอบ)_ |
| Rollback executed | Yes | _(กรอกตอนทดสอบ)_ |
| Index exists after rollback | No | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | ROLLED_BACK | _(กรอกตอนทดสอบ)_ |
| fail_reason | verification_failed | _(กรอกตอนทดสอบ)_ |
| Rollback record status | completed | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Metrics Window:** _(duration)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- ตรวจสอบ index
SHOW INDEX FROM test_orders WHERE Key_name = 'idx_tc06_perf';

-- ตรวจสอบ execution status
SELECT id, status, fail_reason FROM execution_runs WHERE id = 'test-tc06-001';

-- ตรวจสอบ rollback record
SELECT * FROM rollbacks WHERE execution_run_id = 'test-tc06-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม)
```

---

### 2.7 TC-07: Verification Fail with Rollback Fail

**Description:** Verification fail แต่ rollback fail → mark + audit

| Field | Expected | Actual |
|-------|----------|--------|
| ADD INDEX successful | Yes | _(กรอกตอนทดสอบ)_ |
| Verification failed | Yes | _(กรอกตอนทดสอบ)_ |
| Rollback attempted | Yes | _(กรอกตอนทดสอบ)_ |
| Rollback failed | Yes | _(กรอกตอนทดสอบ)_ |
| Index still exists | Yes | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | FAILED | _(กรอกตอนทดสอบ)_ |
| fail_reason | execution_error | _(กรอกตอนทดสอบ)_ |
| Rollback record status | failed | _(กรอกตอนทดสอบ)_ |
| Audit log entry created | Yes | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- ตรวจสอบ index ยังอยู่
SHOW INDEX FROM test_orders WHERE Key_name = 'idx_tc07_fail';

-- ตรวจสอบ execution status
SELECT id, status, fail_reason FROM execution_runs WHERE id = 'test-tc07-001';

-- ตรวจสอบ rollback record
SELECT * FROM rollbacks WHERE execution_run_id = 'test-tc07-001';

-- ตรวจสอบ audit log
SELECT * FROM audit_logs WHERE resource_id = 'test-tc07-001' AND action = 'rollback_failed';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม - ต้อง manual cleanup index หลังทดสอบ)
```

---

### 2.8 TC-08: Low Sample Count - Inconclusive

**Description:** Sample ต่ำ → inconclusive และห้าม auto-rollback

| Field | Expected | Actual |
|-------|----------|--------|
| ADD INDEX successful | Yes | _(กรอกตอนทดสอบ)_ |
| Low sample detected | Yes (< 10 samples) | _(กรอกตอนทดสอบ)_ |
| Rollback performed | No | _(กรอกตอนทดสอบ)_ |
| Index still exists | Yes | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | COMPLETED | _(กรอกตอนทดสอบ)_ |
| fail_reason | NULL | _(กรอกตอนทดสอบ)_ |
| Message contains inconclusive | Yes | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **Sample Count Observed:** _(จำนวน)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- ตรวจสอบ index ยังอยู่
SHOW INDEX FROM test_orders WHERE Key_name = 'idx_tc08_low';

-- ตรวจสอบ execution status
SELECT id, status, fail_reason, message FROM execution_runs WHERE id = 'test-tc08-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม)
```

---

### 2.9 TC-09: Kill Switch API Failure

**Description:** Kill switch API ล่ม → fail-closed abort

| Field | Expected | Actual |
|-------|----------|--------|
| API error detected | Yes | _(กรอกตอนทดสอบ)_ |
| Fail-closed behavior | Yes (assumes active) | _(กรอกตอนทดสอบ)_ |
| Index created | No | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | FAILED | _(กรอกตอนทดสอบ)_ |
| fail_reason | kill_switch | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Start Time:** _(HH:MM:SS)_
- **End Time:** _(HH:MM:SS)_
- **API Error Type:** _(เช่น 500, timeout, connection refused)_
- **Log File/Location:** _(path หรือ reference)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- ตรวจสอบว่า index ไม่ถูกสร้าง
SHOW INDEX FROM test_orders WHERE Key_name = 'idx_tc09_api';

-- ตรวจสอบ execution status
SELECT id, status, fail_reason FROM execution_runs WHERE id = 'test-tc09-001';

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**⚠️ Security Check:**
- [ ] ยืนยันว่า API failure ทำให้ execution ถูก abort (fail-closed)
- [ ] ไม่มี index ถูกสร้างโดยไม่ผ่าน kill switch check

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม - ถ้า fail-closed ไม่ทำงาน ถือว่าเป็น security issue)
```

---

### 2.10 TC-10: Worker Crash and Lease Expiry

**Description:** Worker crash กลางทาง → lease หมดอายุแล้ว worker ใหม่รับต่อได้

| Field | Expected | Actual |
|-------|----------|--------|
| Worker 1 claimed successfully | Yes | _(กรอกตอนทดสอบ)_ |
| Worker 1 crashed | Yes (simulated) | _(กรอกตอนทดสอบ)_ |
| Lease expired | Yes | _(กรอกตอนทดสอบ)_ |
| Worker 2 claimed successfully | Yes (after lease expiry) | _(กรอกตอนทดสอบ)_ |
| Final execution_run Status | COMPLETED | _(กรอกตอนทดสอบ)_ |

**Execution Details:**
- **Worker 1 Start Time:** _(HH:MM:SS)_
- **Worker 1 Crash Time:** _(HH:MM:SS)_
- **Lease Expiry Time:** _(HH:MM:SS)_
- **Worker 2 Start Time:** _(HH:MM:SS)_
- **Worker 2 Claim Time:** _(HH:MM:SS)_
- **Completion Time:** _(HH:MM:SS)_
- **Log Files/Locations:** _(paths หรือ references)_

**Observations:**
```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบ)
```

**Database Verification:**
```sql
-- ตรวจสอบ execution status
SELECT id, status, claimed_by, claimed_at, lease_expires_at FROM execution_runs WHERE id = 'test-tc10-001';

-- ตรวจสอบ claim history
SELECT * FROM execution_claims WHERE execution_run_id = 'test-tc10-001' ORDER BY created_at DESC;

-- ผลลัพธ์:
-- (วางผลลัพธ์ที่ได้)
```

**Result:** ⬜ **PASS** / ⬜ **FAIL**

**Notes:**
```
(หมายเหตุเพิ่มเติม - ระบุว่า Worker 2 detect index ที่มีอยู่แล้วหรือไม่)
```

---

## 3. Test Results Summary

### 3.1 Overall Status

| Metric | Value |
|--------|-------|
| **Overall Status** | ⬜ **ALL PASSED** / ⬜ **PARTIAL** / ⬜ **FAILED** |
| **Test Run Completed** | ⬜ Yes / ⬜ No (stopped early) |
| **Total Test Cases** | 10 |
| **Passed** | _/10 |
| **Failed** | _/10 |
| **Skipped** | _/10 |

### 3.2 Results Summary Table

| TC ID | Test Name | Expected Status | Actual Status | Result |
|-------|-----------|-----------------|---------------|--------|
| TC-01 | Worker Claim Conflict | COMPLETED | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-02 | Kill Switch Before Start | FAILED | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-03 | Kill Switch After ADD INDEX | ROLLED_BACK | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-04 | LOCK=NONE Not Supported | REQUIRES_MANUAL | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-05 | Index Already Exists | FAILED | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-06 | Verification Fail + Rollback OK | ROLLED_BACK | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-07 | Verification Fail + Rollback Fail | FAILED | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-08 | Low Sample - Inconclusive | COMPLETED | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-09 | Kill Switch API Failure | FAILED | _(กรอก)_ | ⬜ Pass / ⬜ Fail |
| TC-10 | Worker Crash + Lease Expiry | COMPLETED | _(กรอก)_ | ⬜ Pass / ⬜ Fail |

### 3.3 Blocker Analysis for Canary Run

> **คำจำกัดความ:** Blocker = Test case ที่ต้องผ่านก่อนอนุญาตให้ทำ Canary Run บน Production

#### Critical Tests (Must Pass Before Canary)

| Priority | TC ID | Test Name | เหตุผล | Status |
|----------|-------|-----------|--------|--------|
| 🔴 P0 | TC-02 | Kill Switch Before Start | ต้องมั่นใจว่า kill switch ทำงาน | ⬜ Pass / ⬜ Fail |
| 🔴 P0 | TC-09 | Kill Switch API Failure | Fail-closed ต้องทำงานเพื่อความปลอดภัย | ⬜ Pass / ⬜ Fail |
| 🔴 P0 | TC-03 | Kill Switch After ADD INDEX | ต้อง rollback ได้ถ้าจำเป็น | ⬜ Pass / ⬜ Fail |
| 🟠 P1 | TC-01 | Worker Claim Conflict | ป้องกัน duplicate execution | ⬜ Pass / ⬜ Fail |
| 🟠 P1 | TC-06 | Verification + Rollback OK | Auto-rollback เมื่อ performance แย่ลง | ⬜ Pass / ⬜ Fail |

#### Blocker Status Summary

| Blocker Type | Total | Passed | Failed | Status |
|--------------|-------|--------|--------|--------|
| P0 (Critical) | 3 | _/3 | _/3 | ⬜ Clear / ⬜ Blocked |
| P1 (High) | 2 | _/2 | _/2 | ⬜ Clear / ⬜ Blocked |
| **All Blockers** | **5** | _/5 | _/5 | ⬜ Clear / ⬜ Blocked |

#### Canary Run Decision

| Decision | Criteria |
|----------|----------|
| ✅ **APPROVED for Canary** | P0 ทั้งหมด PASS และ P1 >= 80% PASS |
| ⚠️ **CONDITIONAL** | P0 ทั้งหมด PASS แต่มี P1 FAIL (ต้อง review) |
| ❌ **BLOCKED** | มี P0 FAIL |

**Decision:** ⬜ APPROVED / ⬜ CONDITIONAL / ⬜ BLOCKED

### 3.4 Failed Tests Detail

_(กรอกเฉพาะ tests ที่ fail)_

#### [TC-XX] _(Test Name)_ - FAILED

**Failure Summary:**
```
(สรุปสาเหตุที่ fail)
```

**Root Cause:**
```
(วิเคราะห์สาเหตุ)
```

**Impact:**
- [ ] Blocks canary run
- [ ] Requires code fix
- [ ] Requires configuration change
- [ ] Test environment issue

**Action Required:**
```
(ระบุสิ่งที่ต้องแก้ไข)
```

**Assigned To:** _(ชื่อ)_

---

## 4. Issues and Observations

### 4.1 Issues Found During Testing

| # | Issue | Severity | TC Related | Status |
|---|-------|----------|------------|--------|
| 1 | _(อธิบาย issue)_ | 🔴 High / 🟠 Medium / 🟢 Low | TC-XX | ⬜ Open / ⬜ Fixed |
| 2 | | | | |
| 3 | | | | |

### 4.2 Observations

```
(บันทึกสิ่งที่สังเกตเห็นระหว่างทดสอบที่ไม่ใช่ issue แต่น่าสนใจ)
```

### 4.3 Recommendations

```
(ข้อเสนอแนะสำหรับการปรับปรุง)
```

---

## 5. Post-Test Cleanup Checklist

| # | Item | Status |
|---|------|--------|
| 1 | Drop all test indexes | ⬜ Done |
| 2 | Delete test execution_runs | ⬜ Done |
| 3 | Delete test rollback records | ⬜ Done |
| 4 | Reset kill switches | ⬜ Done |
| 5 | Clean up audit logs | ⬜ Done |
| 6 | Stop test workers | ⬜ Done |
| 7 | Archive log files | ⬜ Done |

**Cleanup Script Used:**
```sql
-- (วาง script ที่ใช้ cleanup)
```

---

## 6. Sign-off

### Test Execution Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | _(ชื่อ)_ | _(วันที่)_ | ⬜ Approved |
| Reviewer | _(ชื่อ)_ | _(วันที่)_ | ⬜ Approved |
| Tech Lead | _(ชื่อ)_ | _(วันที่)_ | ⬜ Approved |

### Canary Run Approval

| Field | Value |
|-------|-------|
| **Approved for Canary** | ⬜ Yes / ⬜ No |
| **Approved By** | _(ชื่อ)_ |
| **Approval Date** | _(วันที่)_ |
| **Conditions/Notes** | _(ระบุเงื่อนไขถ้ามี)_ |

---

## Appendix A: Log Files Reference

| TC ID | Log File Location | Retention |
|-------|-------------------|-----------|
| TC-01 | _(path)_ | 30 days |
| TC-02 | _(path)_ | 30 days |
| TC-03 | _(path)_ | 30 days |
| TC-04 | _(path)_ | 30 days |
| TC-05 | _(path)_ | 30 days |
| TC-06 | _(path)_ | 30 days |
| TC-07 | _(path)_ | 30 days |
| TC-08 | _(path)_ | 30 days |
| TC-09 | _(path)_ | 30 days |
| TC-10 | _(path)_ | 30 days |

---

## Appendix B: Quick Cleanup Commands

```sql
-- Reset test environment
USE executor_test;

-- Drop all test indexes
DROP INDEX IF EXISTS idx_tc01_customer ON test_orders;
DROP INDEX IF EXISTS idx_tc02_status ON test_orders;
DROP INDEX IF EXISTS idx_tc03_date ON test_orders;
DROP INDEX IF EXISTS idx_tc05_existing ON test_orders;
DROP INDEX IF EXISTS idx_tc06_perf ON test_orders;
DROP INDEX IF EXISTS idx_tc07_fail ON test_orders;
DROP INDEX IF EXISTS idx_tc08_low ON test_orders;
DROP INDEX IF EXISTS idx_tc09_api ON test_orders;
DROP INDEX IF EXISTS idx_tc10_crash ON test_orders;

-- Clear test data
DELETE FROM execution_runs WHERE id LIKE 'test-tc%';
DELETE FROM rollbacks WHERE execution_run_id LIKE 'test-tc%';
DELETE FROM audit_logs WHERE resource_id LIKE 'test-tc%';
DELETE FROM kill_switches WHERE connection_id LIKE 'conn-0%';
```

```bash
# Reset kill switches via API
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/kill-switch \
    -H "Content-Type: application/json" \
    -d "{\"connection_id\": \"conn-00$i\", \"active\": false}"
done
```

---

*Template Version: 1.0*  
*Last Updated: 2026-02-01*  
*Compatible with: [`EXECUTOR_V1_INTEGRATION_TEST_CHECKLIST.md`](EXECUTOR_V1_INTEGRATION_TEST_CHECKLIST.md) v1.0*
