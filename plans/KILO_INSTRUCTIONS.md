# Kilo Instructions (Must Follow)

You must follow the locked scope:
- plans/phase5-executor-scope.md

Rules:
- Executor v1 supports ONLY: ADD_INDEX
- Never implement any other schema changes or config changes
- Execution requires: approved execution_run + scheduled window
- Must include: pre-checks, online DDL strategy, kill switch checks, verification, rollback (DROP INDEX)
- If scope conflicts occur, STOP and ask
