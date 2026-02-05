# PHASE 1 - ออกแบบระบบ (Blueprint)

## 1.1 Architecture Design

### Component List
- Agent (Node.js + TypeScript)
- SaaS Backend
- Database (PostgreSQL)
- API Gateway
- Telemetry Service
- Recommendation Engine
- Audit Logging System

### Component Responsibilities
- **Agent**: Read-only database scanner that collects performance data
- **SaaS Backend**: Processes data from agents and generates recommendations
- **Database**: Stores connection profiles, scan results, recommendations, and audit logs
- **API Gateway**: Handles authentication and routing
- **Telemetry Service**: Collects and processes telemetry data
- **Recommendation Engine**: Analyzes data and generates optimization recommendations
- **Audit Logging System**: Tracks all actions and changes

### Data Flow
1. Agent connects to customer MySQL database (read-only)
2. Agent collects performance data (query digests, schema info, indexes)
3. Agent sends sanitized data to SaaS API
4. SaaS processes data and generates recommendations
5. Recommendations are stored in database
6. User accesses recommendations through web interface

### Security Considerations
- All database connections use read-only credentials
- Data is sanitized before transmission
- API uses authentication and authorization
- No inbound connections to customer databases
- All data transmission uses HTTPS

### Production Constraints
- Agent must not modify any database objects
- Agent must not access sensitive data
- Agent must not impact database performance
- All operations must be safe and reversible
- Agent must comply with customer security policies

## 1.2 Database Design

### Tables
1. **tenants** - Multi-tenant support
2. **connection_profiles** - Database connection settings (encrypted)
3. **scan_runs** - Records of scan operations
4. **schema_snapshots** - Database schema snapshots
5. **query_digests** - Query performance data
6. **recommendation_packs** - Generated recommendations
7. **approvals** - Approval workflow tracking
8. **execution_history** - Execution records
9. **verification_metrics** - Before/after performance metrics
10. **audit_logs** - System audit trail

### Key Relationships
- Tenants → Connection Profiles (1:N)
- Connection Profiles → Scan Runs (1:N)
- Scan Runs → Schema Snapshots (1:1)
- Scan Runs → Query Digests (1:N)
- Recommendation Packs → Approvals (1:1)
- Recommendation Packs → Execution History (1:N)