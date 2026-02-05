# End-to-End Demo Script for Admin UI

## Prerequisites

### Services to Run
- SaaS API (`saas-api/`)
- Admin UI (`admin-ui/`)
- Agent (`agent/`)

### Environment Variables
Set the following environment variables in `.env` files:

#### SaaS API
```env
DATABASE_URL=mysql://user:password@localhost:3306/db_name
JWT_SECRET=your_jwt_secret
```

#### Admin UI
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
```

#### Agent
```env
DATABASE_URL=mysql://user:password@localhost:3306/db_name
API_BASE_URL=http://localhost:8080
```

### Database Setup
1. Run database migrations for SaaS API
2. Seed database with sample data (if needed)

## Demo Steps

### Step 1: Open UI and Login
- **URL**: `http://localhost:3050/admin`
- **Credentials**: Basic Auth (ADMIN_USERNAME/ADMIN_PASSWORD)
- **Expected**: See Admin Dashboard

### Step 2: Navigate to Connections
- **Navigate**: `/admin/connections`
- **Expected**: See list of connections
- **Actions**: View detail, disable/enable connection

### Step 3: Navigate to Recommendations
- **Navigate**: `/admin/recommendations`
- **Expected**: See list of recommendations
- **Action**: Click to view detail of recommendation

### Step 4: Approve Recommendation
- **At recommendation detail page**
- Click "Approve" button
- **Expected**: ConfirmDialog + RiskWarning displayed
- **Confirm**: Click confirm
- **Expected**:
  - Recommendation status changes to "approved"
  - execution_run is created (if agent runs)
  - Audit log is recorded

### Step 5: Schedule Recommendation
- **At another recommendation (pending)**
- Click "Schedule" button
- Select future date/time
- Confirm
- **Expected**:
  - Recommendation status changes to "scheduled"
  - Scheduled time is recorded
  - Audit log is recorded

### Step 6: Navigate to Executions
- **Navigate**: `/admin/executions`
- **Expected**: See list of executions
- View execution that was just approved
- **Expected**: See status timeline, metrics (if any)

### Step 7: View Execution Detail
- Click execution of interest
- **Expected**: See:
  - Status timeline (pending → running → completed/failed)
  - Baseline vs After metrics
  - Verification result
  - Rollback info (if any)

### Step 8: Navigate to Kill Switch
- **Navigate**: `/admin/kill-switch`
- **Expected**: See Global Kill Switch and Per-connection list

### Step 9: Toggle Kill Switch
- Click toggle to enable global kill switch
- **Expected**: ConfirmDialog + reason input displayed
- Enter reason and confirm
- **Expected**:
  - Kill switch enabled
  - KillSwitchBanner displayed throughout app
  - Executions are blocked
  - Audit log is recorded

### Step 10: Verify Block
- Try to approve another recommendation
- **Expected**: Cannot execute (blocked by kill switch)

### Step 11: Disable Kill Switch
- Toggle kill switch back to disabled
- Enter reason
- **Expected**:
  - Kill switch disabled
  - KillSwitchBanner disappears
  - Executions can run again

### Step 12: View Audit Trail
- At Kill Switch page
- View Audit Log section
- **Expected**: See history of kill switch toggles with reason and timestamp

## Verification Checklist
- [ ] Login via Basic Auth successful
- [ ] View list of connections successful
- [ ] View list of recommendations successful
- [ ] Approve recommendation successful (with confirmation)
- [ ] Schedule recommendation successful (with confirmation)
- [ ] View list of executions successful
- [ ] View execution detail with timeline successful
- [ ] Toggle kill switch successful (with reason)
- [ ] Kill switch blocking works
- [ ] Audit logs recorded for every action

## Troubleshooting
### Common Errors and Solutions
- **API Connection Issues**:
  - Ensure all services are running
  - Check that environment variables are set correctly
  - Verify database connectivity

- **Authentication Issues**:
  - Confirm ADMIN_USERNAME and ADMIN_PASSWORD are correct
  - Check that basic auth middleware is properly configured