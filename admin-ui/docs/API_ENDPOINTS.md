# API Endpoints Documentation

This document describes the API endpoints used by the MySQL Production Optimizer Admin UI to interact with the SaaS API.

## Endpoints

### Connections

#### GET /connections
List all database connections.

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "host": "string",
    "port": "number",
    "database": "string",
    "username": "string",
    "status": "active" | "disabled",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```

#### GET /connections/:id
Get a specific connection by ID.

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "host": "string",
  "port": "number",
  "database": "string",
  "username": "string",
  "status": "active" | "disabled",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

#### PUT /connections/:id/status
Update the status of a connection.

**Request Body:**
```json
{
  "status": "active" | "disabled"
}
```

### Recommendations

#### GET /recommendations
List all recommendations.

**Query Parameters:**
- `connectionId` (optional): Filter by connection ID

**Response:**
```json
[
  {
    "id": "string",
    "connectionId": "string",
    "title": "string",
    "description": "string",
    "impact": "low" | "medium" | "high",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "status": "pending" | "approved" | "scheduled" | "executed" | "failed" | "rejected"
  }
]
```

#### GET /recommendations/:id
Get a specific recommendation by ID.

**Response:**
```json
{
  "id": "string",
  "connectionId": "string",
  "title": "string",
  "description": "string",
  "impact": "low" | "medium" | "high",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "status": "pending" | "approved" | "scheduled" | "executed" | "failed" | "rejected",
  "sql": "string",
  "executionPlan": "string",
  "metrics": {
    "executionTime": "number",
    "cpuUsage": "number",
    "memoryUsage": "number"
  }
}
```

#### POST /recommendations/:id/approve
Approve a recommendation for execution.

**Response:** 204 No Content

#### POST /recommendations/:id/schedule
Schedule a recommendation for future execution.

**Request Body:**
```json
{
  "scheduledAt": "string (ISO 8601)"
}
```

### Executions

#### GET /executions
List all executions.

**Query Parameters:**
- `connectionId` (optional): Filter by connection ID

**Response:**
```json
[
  {
    "id": "string",
    "recommendationId": "string",
    "connectionId": "string",
    "status": "pending" | "running" | "completed" | "failed" | "rolled_back",
    "startedAt": "string (ISO 8601)",
    "completedAt": "string (ISO 8601) | null",
    "error": "string | null"
  }
]
```

#### GET /executions/:id
Get a specific execution by ID.

**Response:**
```json
{
  "id": "string",
  "recommendationId": "string",
  "connectionId": "string",
  "status": "pending" | "running" | "completed" | "failed" | "rolled_back",
  "startedAt": "string (ISO 8601)",
  "completedAt": "string (ISO 8601) | null",
  "error": "string | null",
  "logs": ["string"],
  "metrics": {
    "executionTime": "number",
    "cpuUsage": "number",
    "memoryUsage": "number"
  },
  "baselineMetrics": {
    "queryTime": "number",
    "rowsExamined": "number",
    "tableSize": "number"
  },
  "afterMetrics": {
    "queryTime": "number",
    "rowsExamined": "number",
    "tableSize": "number"
  },
  "verificationResult": {
    "status": "pending" | "pass" | "fail",
    "checkedAt": "string (ISO 8601)",
    "details": "string"
  },
  "rollbackInfo": {
    "rolledBackAt": "string (ISO 8601)",
    "reason": "string",
    "rollbackDdl": "string",
    "triggeredBy": "auto" | "manual"
  } | null
}
```

### Kill Switch

#### GET /kill-switch
Get the current kill switch status.

**Response:**
```json
{
  "global": "boolean",
  "connections": {
    "connectionId": "boolean"
  }
}
```

#### POST /kill-switch/:connectionId
Toggle the kill switch for a connection or globally.

**Request Body:**
```json
{
  "enabled": "boolean",
  "reason": "string"
}
```

#### GET /kill-switch/audit-logs
Get audit logs for kill switch actions.

**Response:**
```json
[
  {
    "id": "string",
    "timestamp": "string (ISO 8601)",
    "action": "enabled" | "disabled",
    "scope": "global" | "connection",
    "reason": "string",
    "triggeredBy": "string",
    "connectionId": "string | null"
  }
]
```

### Audit Logs

#### GET /audit-logs
Get audit logs.

**Query Parameters:**
- `connectionId` (optional): Filter by connection ID
- `action` (optional): Filter by action type
- `userId` (optional): Filter by user ID

**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "action": "string",
    "resource": "string",
    "resourceId": "string",
    "timestamp": "string (ISO 8601)",
    "details": "object"
  }
]
```