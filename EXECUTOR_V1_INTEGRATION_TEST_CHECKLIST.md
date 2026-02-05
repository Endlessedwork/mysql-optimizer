# Integration Test Checklist สำหรับ Executor v1

## สรุป Test Coverage

| Test ID | Description |
|---------|-------------|
| TC-01 | Worker 2 ตัว claim execution_run เดียวกัน → ต้องรันได้ตัวเดียว |
| TC-02 | Kill switch เปิดก่อนเริ่ม → abort |
| TC-03 | Kill switch เปิดหลัง ADD INDEX ก่อน verify → rollback |
| TC-04 | MySQL ไม่รองรับ LOCK=NONE → mark requires_manual |
| TC-05 | Index มีอยู่แล้ว → abort |
| TC-06 | Verification fail → rollback success |
| TC-07 | Verification fail แต่ rollback fail → mark + audit |
| TC-08 | Sample ต่ำ → inconclusive และห้าม auto-rollback |
| TC-09 | Kill switch API ล่ม → fail-closed abort |
| TC-10 | Worker crash กลางทาง → lease หมดอายุแล้ว worker ใหม่รับต่อได้ |

## Test Cases

| Test ID | Description | Setup | Action | Expected Result | execution_run Final Status |
|---------|-------------|-------|--------|----------------|---------------------------|
| TC-01 | Worker 2 ตัว claim execution_run เดียวกัน → ต้องรันได้ตัวเดียว | 1. มี execution_run ที่ยังไม่ถูก claim<br>2. 2 worker พร้อมรัน | 1. Worker 1 รัน claim execution<br>2. Worker 2 รัน claim execution | 1. Worker 1 ได้ claim สำเร็จ<br>2. Worker 2 ไม่ได้ claim ได้ (409 Conflict)<br>3. Worker 1 ทำงานต่อ<br>4. Worker 2 หยุดทำงาน | COMPLETED |
| TC-02 | Kill switch เปิดก่อนเริ่ม → abort | 1. มี execution_run<br>2. Kill switch ถูกเปิดไว้ก่อนเริ่ม | 1. Worker รัน execution<br>2. ตรวจสอบ kill switch ก่อน execute | 1. Kill switch ถูกตรวจสอบ<br>2. ถ้า active → abort execution<br>3. บันทึก status เป็น FAILED<br>4. บันทึก fail_reason เป็น kill_switch | FAILED |
| TC-03 | Kill switch เปิดหลัง ADD INDEX ก่อน verify → rollback | 1. มี execution_run<br>2. Kill switch ถูกเปิดหลัง ADD INDEX | 1. Worker รัน execution<br>2. ทำ ADD INDEX สำเร็จ<br>3. ตรวจสอบ kill switch หลัง ADD INDEX | 1. ถ้า kill switch เปิดหลัง ADD INDEX<br>2. ทำการ rollback<br>3. บันทึก status เป็น ROLLED_BACK<br>4. บันทึก fail_reason เป็น kill_switch | ROLLED_BACK |
| TC-04 | MySQL ไม่รองรับ LOCK=NONE → mark requires_manual | 1. มี execution_run<br>2. MySQL ไม่รองรับ LOCK=NONE | 1. Worker รัน execution<br>2. ทำ ADD INDEX ที่ใช้ LOCK=NONE | 1. ถ้า MySQL ไม่รองรับ LOCK=NONE<br>2. บันทึก status เป็น REQUIRES_MANUAL<br>3. บันทึก fail_reason เป็น execution_error | REQUIRES_MANUAL |
| TC-05 | Index มีอยู่แล้ว → abort | 1. มี execution_run<br>2. Index ที่จะสร้างมีอยู่แล้วใน table | 1. Worker รัน execution<br>2. ตรวจสอบว่า index มีอยู่แล้ว | 1. ถ้า index มีอยู่แล้ว<br>2. บันทึก status เป็น FAILED<br>3. บันทึก fail_reason เป็น execution_error | FAILED |
| TC-06 | Verification fail → rollback success | 1. มี execution_run<br>2. Verification ผ่านไม่ได้ (latency แย่กว่า threshold) | 1. Worker รัน execution<br>2. ทำ ADD INDEX<br>3. ตรวจสอบ metrics ผ่าน verification | 1. ถ้า verification ผ่านไม่ได้<br>2. ทำการ rollback<br>3. บันทึก status เป็น ROLLED_BACK<br>4. บันทึก fail_reason เป็น verification_failed | ROLLED_BACK |
| TC-07 | Verification fail แต่ rollback fail → mark + audit | 1. มี execution_run<br>2. Verification ผ่านไม่ได้<br>3. Rollback ล้มเหลว | 1. Worker รัน execution<br>2. ทำ ADD INDEX<br>3. ตรวจสอบ metrics ผ่าน verification<br>4. ทำ rollback แต่ล้มเหลว | 1. ถ้า rollback ล้มเหลว<br>2. บันทึก status เป็น FAILED<br>3. บันทึก fail_reason เป็น execution_error<br>4. บันทึก audit log สำหรับ rollback ล้มเหลว | FAILED |
| TC-08 | Sample ต่ำ → inconclusive และห้าม auto-rollback | 1. มี execution_run<br>2. Sample count < 10 | 1. Worker รัน execution<br>2. ทำ ADD INDEX<br>3. ตรวจสอบ metrics ผ่าน verification<br>4. ตรวจสอบ sample count | 1. ถ้า sample count < 10<br>2. ไม่ auto-rollback<br>3. บันทึก status เป็น COMPLETED<br>4. บันทึก message ว่า inconclusive | COMPLETED |
| TC-09 | Kill switch API ล่ม → fail-closed abort | 1. มี execution_run<br>2. Kill switch API ล่ม | 1. Worker รัน execution<br>2. ตรวจสอบ kill switch API | 1. ถ้า API error<br>2. ถ้า API ล่ม → assume kill switch active<br>3. บันทึก status เป็น FAILED<br>4. บันทึก fail_reason เป็น kill_switch | FAILED |
| TC-10 | Worker crash กลางทาง → lease หมดอายุแล้ว worker ใหม่รับต่อได้ | 1. มี execution_run<br>2. Worker ล้มเหลวกลางทาง<br>3. Lease หมดอายุ | 1. Worker 1 รัน claim execution<br>2. Worker 1 ล้มเหลว<br>3. Lease หมดอายุ<br>4. Worker 2 รัน claim execution | 1. Worker 1 ล้มเหลว<br>2. Lease หมดอายุ<br>3. Worker 2 สามารถ claim ได้<br>4. Worker 2 ทำงานต่อ | COMPLETED |

## Tracking Checklist

- [ ] TC-01: Worker 2 ตัว claim execution_run เดียวกัน → ต้องรันได้ตัวเดียว
- [ ] TC-02: Kill switch เปิดก่อนเริ่ม → abort
- [ ] TC-03: Kill switch เปิดหลัง ADD INDEX ก่อน verify → rollback
- [ ] TC-04: MySQL ไม่รองรับ LOCK=NONE → mark requires_manual
- [ ] TC-05: Index มีอยู่แล้ว → abort
- [ ] TC-06: Verification fail → rollback success
- [ ] TC-07: Verification fail แต่ rollback fail → mark + audit
- [ ] TC-08: Sample ต่ำ → inconclusive และห้าม auto-rollback
- [ ] TC-09: Kill switch API ล่ม → fail-closed abort
- [ ] TC-10: Worker crash กลางทาง → lease หมดอายุแล้ว worker ใหม่รับต่อได้