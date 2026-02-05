# Phase 5 Executor v1 Scope (LOCKED)

## Allowed (v1)
- Apply action: ADD_INDEX only
- Only for approved execution_run within scheduled window
- Must support: pre-check, apply (online DDL), verify, rollback (DROP INDEX)
- Must record: audit logs, execution logs, verification metrics

## Not Allowed (v1)
- Any schema change except ADD INDEX (no ALTER COLUMN, DROP COLUMN, RENAME, PARTITION, etc.)
- Any config change (my.cnf / dynamic variables)
- Query rewrite / app code changes
- Data migration / backfill
- Automatic execution without explicit user approval

## Exit Criteria (v1)
- Can execute ADD_INDEX safely with kill switch + rollback + verification
- Has before/after metrics comparison and auto-rollback on failure
