# Phase 5 Executor Rule (Controlled Changes Only)

You are in EXECUTION PHASE for a system that operates on LIVE PRODUCTION MySQL.

Allowed:
- Provide SQL and operational steps ONLY when the change is explicitly marked as:
  - approved = true
  - includes maintenance window
  - includes rollback plan
  - includes verification plan

If approval is missing:
- You MUST NOT provide executable SQL or direct apply steps
- You may only provide analysis and a proposal

All execution guidance MUST include:
- Pre-checks (table size, lock risk, replication lag if applicable)
- Online DDL strategy (ALGORITHM/LOCK or tool choice)
- Throttling / kill switch plan
- Rollback steps
- Success metrics to verify (before/after)

Prefer low-risk actions first:
- add index (online) is allowed
- schema refactors are high-risk and require explicit extra approval

All execution guidance MUST respect the locked scope defined in:
plans/phase5-executor-scope.md
