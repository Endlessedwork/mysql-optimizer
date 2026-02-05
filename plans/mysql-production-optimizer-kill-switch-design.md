# MySQL Production Optimizer - Kill Switch + Rollback System Design

## 1. Data Model

### 1.1 Kill Switch State Table

ตาราง `kill_switch_states` ใช้สำหรับจัดการสถานะ kill switch ทั้งแบบ global และ per-connection

```sql
CREATE TABLE kill_switch_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    connection_profile_id UUID REFERENCES connection_profiles(id),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);
```

**Fields:**
- `id`: UUID สำหรับ identifier ของ record
- `tenant_id`: ชี้ไปยัง tenant ที่เกี่ยวข้อง (รองรับ multi-tenant)
- `connection_profile_id`: ชี้ไปยัง connection profile ที่เกี่ยวข้อง (ถ้าเป็น per-connection)
- `is_active`: สถานะของ kill switch (TRUE = ปิด, FALSE = เปิด)
- `created_at`: วันที่สร้าง record
- `updated_at`: วันที่อัปเดต record
- `created_by`: ผู้สร้าง record
- `updated_by`: ผู้อัปเดต record

### 1.2 Rollback Record Table

ตาราง `rollback_records` ใช้สำหรับบันทึกประวัติการ rollback ที่เกี่ยวข้องกับ execution_run

```sql
CREATE TABLE rollback_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID REFERENCES execution_history(id),
    tenant_id UUID REFERENCES tenants(id),
    connection_profile_id UUID REFERENCES connection_profiles(id),
    rollback_status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
    rollback_type VARCHAR(50), -- full, partial, none
    rollback_started_at TIMESTAMP,
    rollback_completed_at TIMESTAMP,
    rollback_error TEXT,
    rollback_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: UUID สำหรับ identifier ของ record
- `execution_run_id`: ชี้ไปยัง execution_run ที่เกี่ยวข้อง
- `tenant_id`: ชี้ไปยัง tenant ที่เกี่ยวข้อง (รองรับ multi-tenant)
- `connection_profile_id`: ชี้ไปยัง connection profile ที่เกี่ยวข้อง
- `rollback_status`: สถานะการ rollback (pending, in_progress, completed, failed)
- `rollback_type`: ประเภทการ rollback (full, partial, none)
- `rollback_started_at`: วันที่เริ่ม rollback
- `rollback_completed_at`: วันที่เสร็จสิ้น rollback
- `rollback_error`: ข้อผิดพลาดที่เกิดขึ้นระหว่าง rollback
- `rollback_details`: รายละเอียดการ rollback ในรูปแบบ JSONB
- `created_at`: วันที่สร้าง record
- `updated_at`: วันที่อัปเดต record

### 1.3 ความสัมพันธ์กับ execution_run

ตาราง `execution_history` มีความสัมพันธ์กับ `rollback_records` ผ่าน `execution_run_id` field

## 2. API Endpoints

### 2.1 Kill Switch Management

#### 2.1.1 เปิด/ปิด kill switch แบบ global
```
PUT /api/kill-switch/global
{
  "is_active": true
}
```

#### 2.1.2 เปิด/ปิด kill switch แบบ per-connection
```
PUT /api/kill-switch/connection/{connection_profile_id}
{
  "is_active": true
}
```

#### 2.1.3 ตรวจสอบสถานะ kill switch
```
GET /api/kill-switch/status
```

### 2.2 Rollback Management

#### 2.2.1 Trigger rollback สำหรับ execution_run
```
POST /api/rollback/{execution_run_id}/trigger
{
  "rollback_type": "full" | "partial",
  "reason": "string"
}
```

#### 2.2.2 ตรวจสอบประวัติ rollback
```
GET /api/rollback/history/{execution_run_id}
```

### 2.3 สถานะระบบ

#### 2.3.1 ตรวจสอบสถานะ kill switch สำหรับ tenant
```
GET /api/kill-switch/tenant/{tenant_id}/status
```

## 3. Executor Behavior

### 3.1 เมื่อ kill switch เปิดกลางทาง

เมื่อ executor ตรวจพบว่า kill switch ถูกเปิด (is_active = TRUE) ระบบจะ:

1. หยุดการ execute คำสั่งที่กำลังดำเนินอยู่
2. บันทึกสถานะการหยุดลงใน `rollback_records`
3. แจ้งเตือนผู้ใช้ผ่าน audit log
4. ตั้งค่าสถานะ execution_run เป็น 'cancelled'

### 3.2 เมื่อ verification fail (after metrics แย่กว่า baseline)

เมื่อ executor ตรวจพบว่า metrics หลังการ execute แย่กว่า baseline:

1. ระบบจะเริ่มกระบวนการ rollback อัตโนมัติ
2. บันทึกข้อมูล rollback ใน `rollback_records`
3. ดำเนินการ rollback ตามประเภทที่กำหนด
4. อัปเดตสถานะ execution_run เป็น 'failed'
5. แจ้งเตือนผู้ใช้ผ่าน audit log

## 4. Edge Cases และวิธีจัดการ

### 4.1 Concurrent Execution หลาย recommendations

- ระบบจะใช้ lock mechanism เพื่อป้องกันการ execute พร้อมกัน
- แต่ละ execution_run จะมีการจัดการ kill switch แยกต่างหาก
- ระบบจะติดตามสถานะของแต่ละ connection profile แยกกัน

### 4.2 Partial Rollback

- ระบบรองรับการ rollback แบบ partial สำหรับกรณีที่บาง action สามารถ rollback ได้ บางอันไม่ได้
- บันทึกข้อมูลการ rollback แยกตามแต่ละ action
- แจ้งเตือนผู้ใช้เกี่ยวกับ partial rollback ที่เกิดขึ้น

### 4.3 Network Failure ระหว่าง Rollback

- ระบบจะมี mechanism สำหรับ retry ในการ rollback
- บันทึกสถานะการ rollback อย่างละเอียดเพื่อให้สามารถ recover ได้
- ระบบจะมี monitoring สำหรับตรวจสอบสถานะการ rollback

### 4.4 ข้อจำกัดของ MySQL DDL Rollback

- ระบบจะตรวจสอบก่อนการ execute ว่า DDL สามารถ rollback ได้หรือไม่
- สำหรับ DDL ที่ไม่สามารถ rollback ได้ ระบบจะแจ้งเตือนผู้ใช้
- ระบบจะมี fallback mechanism สำหรับกรณีที่ไม่สามารถ rollback ได้

## 5. ความสัมพันธ์กับระบบปัจจุบัน

### 5.1 Integration with Existing Models

- `ExecutionRun` model ใน `saas-api/src/models/metrics.model.ts` จะถูกใช้ร่วมกับ `rollback_records`
- ระบบจะใช้ `execution_history` สำหรับการติดตามการ execute จริง
- ระบบจะใช้ `approval` สำหรับการติดตามการอนุมัติ

### 5.2 Multi-tenant Support

- ทุกตารางจะมี `tenant_id` field เพื่อรองรับ multi-tenant
- ระบบจะตรวจสอบ tenant_id ก่อนดำเนินการใดๆ
- ระบบจะแยกข้อมูลตาม tenant อย่างชัดเจน

## 6. ความปลอดภัยและ Audit

### 6.1 Audit Logs

- ทุกการเปลี่ยนแปลงของ kill switch จะถูกบันทึกใน audit_logs
- ทุกการ trigger rollback จะถูกบันทึกใน audit_logs
- ระบบจะมี mechanism สำหรับ monitoring การใช้งานที่ไม่เหมาะสม

### 6.2 Access Control

- เฉพาะผู้ที่มีสิทธิ์เฉพาะเจาะจงเท่านั้นที่สามารถเปิด/ปิด kill switch ได้
- ระบบจะตรวจสอบสิทธิ์ก่อนดำเนินการใดๆ