export type ExecutionAction = 'ADD_INDEX';

export type ExecutionStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'rolled_back';

export type VerificationStatus = 'success' | 'failed' | 'inconclusive';

export interface ExecutionRun {
  id: string;
  connection_id: string;
  action: ExecutionAction;
  table_name: string;
  index_name: string;
  columns: string[];
  query_digests: string[];
  status: ExecutionStatus;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  fail_reason?: 'out_of_scope' | 'kill_switch' | 'claim_failed' | 'execution_error' | 'verification_failed';
}

export interface QueryMetrics {
  digest: string;
  digest_text: string;
  count_star: number;
  avg_latency_ms: number;
  rows_examined: number;
  full_scan_count: number;
  sample_count: number;
}

export interface BaselineMetrics {
  timestamp: string;
  table_name: string;
  query_metrics: QueryMetrics[];
}

export interface AfterMetrics extends BaselineMetrics {
  window_minutes: 5 | 30;
}

export interface VerificationResult {
  status: VerificationStatus;
  message: string;
  metrics_comparison?: {
    avg_latency_change_percent: number;
    rows_examined_change_percent: number;
    full_scan_increased: boolean;
  };
  sample_count?: number;
}

export interface RollbackRecord {
  execution_run_id: string;
  rollback_type: 'auto' | 'manual';
  trigger_reason: string;
  rollback_sql: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: Date;
}

export interface AuditLogEntry {
  execution_run_id: string;
  action: string;
  old_status?: ExecutionStatus;
  new_status?: ExecutionStatus;
  details: Record<string, any>;
  timestamp: Date;
}

// ============================================
// Multi-step Recommendation Types (Phase 1)
// ============================================

/**
 * ประเภทของ step ใน multi-step recommendation
 */
export type StepType =
  | 'explain_before'    // รัน EXPLAIN ก่อนแก้ไข
  | 'execute_fix'       // รัน SQL fix
  | 'explain_after'     // รัน EXPLAIN หลังแก้ไข
  | 'verify'            // ตรวจสอบผล
  | 'rollback';         // Rollback ถ้าผิดพลาด

/**
 * สถานะของแต่ละ step
 */
export type StepStatus =
  | 'pending'           // ยังไม่เริ่ม
  | 'ready'             // พร้อมทำ (step ก่อนหน้าเสร็จแล้ว)
  | 'in_progress'       // กำลังทำ
  | 'completed'         // เสร็จสิ้น
  | 'skipped'           // ข้ามไป
  | 'failed';           // ล้มเหลว

/**
 * Evidence ที่เก็บจากการรัน step
 */
export interface StepEvidence {
  collected_at: string;
  step_id: string;
  type: 'explain_result' | 'execution_result' | 'verification_result';
  data: {
    // EXPLAIN result
    explain_json?: Record<string, any>;
    access_type?: string;
    rows_examined?: number;
    using_index?: boolean;
    using_filesort?: boolean;
    using_temporary?: boolean;

    // Execution result
    affected_rows?: number;
    execution_time_ms?: number;
    warnings?: string[];

    // Verification result
    performance_change_percent?: number;
    success?: boolean;
    message?: string;
  };
}

/**
 * Single step in a multi-step recommendation
 */
export interface RecommendationStep {
  id: string;                           // e.g., 'step_1_explain_before'
  step_number: number;                  // 1, 2, 3, ...
  step_type: StepType;
  label: string;                        // UI label, e.g., "วิเคราะห์ Query"
  description: string;                  // รายละเอียด
  sql: string;                          // SQL ที่จะรัน
  status: StepStatus;

  // Dependencies
  requires_step_id?: string;            // step ก่อนหน้าที่ต้องเสร็จก่อน

  // Evidence storage
  evidence?: StepEvidence;              // ผลลัพธ์หลังรัน

  // Metadata
  estimated_time_sec?: number;
  warning?: string;                     // คำเตือน เช่น "อาจ lock table"

  // Timestamps
  started_at?: string;
  completed_at?: string;
}

/**
 * Extended fix option with multi-step support
 * (Backward compatible with existing fix_options)
 */
export interface MultiStepFixOption {
  id: string;
  description: string;
  implementation: string;               // SQL หลักที่จะรัน (backward compatible)
  rollback?: string;
  estimated_impact?: string;
  warning?: string;

  // Multi-step fields (new)
  is_multistep?: boolean;               // Flag บอกว่าเป็น multi-step
  total_steps?: number;                 // จำนวน steps ทั้งหมด
  current_step?: number;                // step ปัจจุบัน (1-indexed)
  steps?: RecommendationStep[];         // รายละเอียดแต่ละ step

  // Roadmap summary for UI
  roadmap?: {
    title: string;                      // e.g., "แก้ไข Full Table Scan"
    summary: string;                    // สรุปสั้นๆ
    steps_preview: string[];            // ["1. EXPLAIN", "2. CREATE INDEX", "3. VERIFY"]
  };
}

/**
 * Template สำหรับสร้าง multi-step recommendation
 */
export const MULTISTEP_TEMPLATES: Record<string, {
  steps: Omit<RecommendationStep, 'id' | 'status' | 'sql'>[];
}> = {
  'add_index': {
    steps: [
      {
        step_number: 1,
        step_type: 'explain_before',
        label: 'วิเคราะห์ Query ก่อนแก้ไข',
        description: 'รัน EXPLAIN เพื่อดู execution plan ปัจจุบัน',
        estimated_time_sec: 5
      },
      {
        step_number: 2,
        step_type: 'execute_fix',
        label: 'สร้าง Index',
        description: 'รัน CREATE INDEX บน columns ที่แนะนำ',
        requires_step_id: 'step_1',
        estimated_time_sec: 60,
        warning: 'ขึ้นกับขนาด table'
      },
      {
        step_number: 3,
        step_type: 'explain_after',
        label: 'ตรวจสอบ Execution Plan',
        description: 'รัน EXPLAIN อีกครั้งเพื่อยืนยันว่าใช้ index ใหม่',
        requires_step_id: 'step_2',
        estimated_time_sec: 5
      },
      {
        step_number: 4,
        step_type: 'verify',
        label: 'ยืนยันผลลัพธ์',
        description: 'เปรียบเทียบ metrics ก่อน-หลัง',
        requires_step_id: 'step_3',
        estimated_time_sec: 10
      }
    ]
  },
  'optimize_table': {
    steps: [
      {
        step_number: 1,
        step_type: 'explain_before',
        label: 'ตรวจสอบ Fragmentation',
        description: 'ดู DATA_FREE และขนาด table ก่อน optimize',
        estimated_time_sec: 5
      },
      {
        step_number: 2,
        step_type: 'execute_fix',
        label: 'Optimize Table',
        description: 'รัน OPTIMIZE TABLE เพื่อ defragment',
        requires_step_id: 'step_1',
        estimated_time_sec: 300,
        warning: 'อาจ lock table ขณะทำงาน'
      },
      {
        step_number: 3,
        step_type: 'verify',
        label: 'ยืนยัน Fragmentation ลดลง',
        description: 'ตรวจสอบว่า DATA_FREE ลดลง',
        requires_step_id: 'step_2',
        estimated_time_sec: 5
      }
    ]
  },
  'drop_unused_index': {
    steps: [
      {
        step_number: 1,
        step_type: 'explain_before',
        label: 'บันทึก Index Definition',
        description: 'เก็บ SHOW CREATE TABLE เพื่อใช้ rollback',
        estimated_time_sec: 5
      },
      {
        step_number: 2,
        step_type: 'execute_fix',
        label: 'ลบ Index',
        description: 'รัน DROP INDEX',
        requires_step_id: 'step_1',
        estimated_time_sec: 30
      },
      {
        step_number: 3,
        step_type: 'verify',
        label: 'ยืนยัน Write Performance',
        description: 'ตรวจสอบว่า write overhead ลดลง',
        requires_step_id: 'step_2',
        estimated_time_sec: 60
      }
    ]
  }
};