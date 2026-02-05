# MySQL Production Optimizer Admin UI

## Overview

The MySQL Production Optimizer Admin UI is a control panel designed for internal administrators to manage database connections, review optimization recommendations, schedule executions, and monitor system status. The interface is built with Next.js 14, TypeScript, Tailwind CSS, and React Query, providing a secure and efficient way to interact with the MySQL optimization system.

## Features

This admin UI provides four main functional areas:

1. **Connections Management**
   - List and view database connections
   - Enable/disable connections
   - View connection details and status

2. **Recommendations Management**
   - List and view optimization recommendations
   - Approve recommendations for execution
   - Schedule recommendations for future execution

3. **Executions Monitoring**
   - List and view execution history
   - Compare baseline and after metrics
   - View verification results and rollback information

4. **Kill Switch Control**
   - Global kill switch toggle
   - Per-connection kill switch control
   - Audit trail for all kill switch actions

## Tech Stack

- **Next.js 14** - React framework for production
- **TypeScript** - Type safety and better developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Server state management
- **Basic Authentication** - Authentication middleware

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. Clone the repository
2. Navigate to the admin-ui directory:
   ```bash
   cd admin-ui
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env.local` file in the `admin-ui` directory with the following variables:

```env
# API Base URL (required)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# API Secret (required)
API_SECRET=your-api-secret-here

# Admin credentials (required)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
```

### Running Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3050/admin`

### Building for Production

```bash
npm run build
npm start
```

## Authentication

The Admin UI uses Basic Authentication to secure access. The middleware in `src/middleware.ts` protects all routes under `/admin`.

To set credentials:
1. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables
2. The middleware will validate these against incoming requests

## Pages Overview

### Connections
- **List View**: Shows all database connections with status filtering
- **View Details**: Displays connection information and status
- **Disable/Enable**: Toggle connection status with confirmation

### Recommendations
- **List View**: Shows all recommendations with status filtering
- **View Details**: Displays recommendation details including SQL, execution plan, and metrics
- **Approve**: Approve recommendations for execution with risk warning
- **Schedule**: Schedule recommendations for future execution with confirmation

### Executions
- **List View**: Shows execution history with filtering options
- **View Details**: Displays execution metrics comparison, verification results, and rollback information
- **Metrics Comparison**: Visual comparison of baseline and after metrics

### Kill Switch
- **Global Toggle**: Enable/disable global execution
- **Per-Connection Toggle**: Enable/disable specific connection execution
- **Audit Trail**: View all kill switch actions with timestamps and reasons

## API Integration

### API Client

The application uses `src/lib/api-client.ts` to communicate with the SaaS API. The client handles:
- Authentication via API secret header
- Error handling for failed requests
- Type-safe responses using TypeScript

### Required SaaS API Endpoints

The following endpoints are used by the admin UI:

- `GET /connections` - List all connections
- `GET /connections/:id` - Get a specific connection
- `PUT /connections/:id/status` - Update connection status
- `GET /recommendations` - List all recommendations
- `GET /recommendations/:id` - Get a specific recommendation
- `POST /recommendations/:id/approve` - Approve a recommendation
- `POST /recommendations/:id/schedule` - Schedule a recommendation
- `GET /executions` - List all executions
- `GET /kill-switch` - Get kill switch status
- `POST /kill-switch/:connectionId` - Toggle kill switch
- `GET /kill-switch/audit-logs` - Get kill switch audit logs
- `GET /audit-logs` - Get audit logs

## Safety Features

The Admin UI implements all safety features as defined in `admin-ui-rule.md`:

### Read-only by Default
- All pages load in read-only mode
- Write actions require explicit confirmation

### Confirmation Dialogs
- Approve actions require confirmation
- Schedule actions require confirmation
- Kill switch toggles require reason input

### Risk Warnings
- Displayed before executing any recommendation
- Shows table size, estimated impact, and rollback plan

### Kill Switch Banner
- Shows blocking banner when kill switch is active
- Prevents execution of recommendations

### Audit Logging
- Every click generates an audit log
- Audit history is surfaced in the Kill Switch page

## Development Guide

### Adding New Pages

1. Create a new route in `src/app/admin/`
2. Add the page component in `src/app/admin/[page]/page.tsx`
3. Add the page to the sidebar navigation in `src/components/layout/Sidebar.tsx`

### Adding New Components

1. Create component files in `src/components/[category]/`
2. Export components in `src/components/index.ts`
3. Import and use components in pages or other components

### Adding New API Endpoints

1. Add new functions to `src/lib/api-client.ts`
2. Update types in `src/lib/types.ts` if needed
3. Use the new functions in components or hooks

## Troubleshooting

### Authentication Issues
- Ensure `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set correctly
- Check that the credentials match what's configured in the environment

### API Connection Issues
- Verify `NEXT_PUBLIC_API_BASE_URL` points to the correct API endpoint
- Confirm `API_SECRET` is set correctly

### Build Errors
- Ensure all dependencies are installed with `npm install`
- Check TypeScript compilation errors with `npm run lint`

## License

This project is licensed under the MIT License.