# Docker Setup Guide

## Prerequisites

- Docker 24.0+
- Docker Compose 2.20+

## Quick Start

### 1. Create environment file

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` and set secure passwords.

### 2. Start services (Production)

```bash
docker compose -f docker-compose.yml --env-file .env.docker up -d
```

### 3. Start services (Development)

```bash
docker compose --env-file .env.docker up -d
```

Development mode includes:
- Hot reload for code changes
- Source code mounted as volumes
- PostgreSQL accessible on localhost:5432

## Service URLs

| Service | URL |
|---------|-----|
| Admin UI | http://localhost:3050 |
| SaaS API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |

## Commands

### View logs

```bash
docker compose logs -f saas-api
docker compose logs -f admin-ui
docker compose logs -f postgres
```

### Restart service

```bash
docker compose restart saas-api
```

### Rebuild after code changes

```bash
docker compose up -d --build saas-api
```

### Stop all services

```bash
docker compose down
```

### Stop and remove volumes (CAUTION: deletes data)

```bash
docker compose down -v
```

## Health Checks

All services have health checks configured:

```bash
# Check service health
docker compose ps

# Manual health check
curl http://localhost:3001/health
curl http://localhost:3050
```

## Database Management

### Connect to PostgreSQL

```bash
docker compose exec postgres psql -U optimizer_user -d mysql_optimizer
```

### Run migrations

```bash
docker compose exec postgres psql -U optimizer_user -d mysql_optimizer -f /path/to/migration.sql
```

### Backup database

```bash
docker compose exec postgres pg_dump -U optimizer_user mysql_optimizer > backup.sql
```

## Troubleshooting

### Service won't start

1. Check logs: `docker compose logs <service-name>`
2. Check health: `docker compose ps`
3. Verify environment variables in `.env.docker`

### Database connection failed

1. Wait for PostgreSQL health check: ~30 seconds
2. Verify credentials in `.env.docker`
3. Check network: `docker network ls`

### Hot reload not working

1. Verify volume mounts in `docker-compose.override.yml`
2. Check file permissions
3. Restart the service

## Security Notes

1. Never commit `.env.docker` to version control
2. Use strong passwords in production
3. Change default ports if exposed publicly
4. Admin UI should not be publicly accessible