# MySQL Production Optimizer - Production Deployment Guide

## Prerequisites

### Hardware Requirements
- **CPU**: Minimum 2 vCPUs, recommended 4 vCPUs
- **RAM**: Minimum 4GB, recommended 8GB
- **Storage**: Minimum 20GB SSD, recommended 50GB+ for logs and database
- **Network**: Stable internet connection for external API calls

### Software Requirements
- **Docker Engine**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js**: Version 18 or higher (for manual deployment)
- **PostgreSQL**: Version 16 or higher (for manual deployment)
- **Git**: For source code management

### Network Requirements
- **Ports**:
  - `5432`: PostgreSQL database
  - `3001`: SaaS API service
  - `3050`: Admin UI service
- **Firewall**: Allow inbound connections on ports 5432, 3001, and 3050
- **SSL/TLS**: Required for production deployment (Let's Encrypt recommended)

## Deployment Options

### EasyPanel (Compose)

สำหรับ deploy บน [EasyPanel](https://easypanel.io) ใช้ Compose จาก root โปรเจกต์ และตั้งค่า env ตาม `easypanel/.env.easypanel.example` ดูคำแนะนำเต็มใน **easypanel/EASYPANEL.md**

### Docker Compose (Recommended)

The easiest way to deploy MySQL Production Optimizer is using Docker Compose. This method ensures all services are properly configured and connected.

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mysql-production-optimizer
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your specific values
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Verify deployment**:
   ```bash
   docker-compose ps
   ```

### Manual Deployment

Manual deployment is recommended for advanced users who need custom configurations.

#### 1. PostgreSQL Setup
```bash
# Install PostgreSQL 16
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE mysql_optimizer;
CREATE USER optimizer_user WITH PASSWORD 'optimizer_password';
GRANT ALL PRIVILEGES ON DATABASE mysql_optimizer TO optimizer_user;
\q
```

#### 2. SaaS API Setup
```bash
cd saas-api
npm install
npm run build
npm start
```

#### 3. Admin UI Setup
```bash
cd admin-ui
npm install
npm run build
npm start
```

### Kubernetes Deployment

For large-scale deployments, Kubernetes is recommended.

1. **Create Kubernetes manifests**:
   ```bash
   # Create configmaps for environment variables
   kubectl create configmap saas-api-config --from-env-file=.env
   kubectl create configmap admin-ui-config --from-env-file=.env
   ```

2. **Deploy services**:
   ```bash
   kubectl apply -f k8s/postgres-deployment.yaml
   kubectl apply -f k8s/saas-api-deployment.yaml
   kubectl apply -f k8s/admin-ui-deployment.yaml
   ```

## Environment Configuration

### Production Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
POSTGRES_DB=mysql_optimizer
POSTGRES_USER=optimizer_user
POSTGRES_PASSWORD=optimizer_password
POSTGRES_PORT=5432

# API Configuration
API_PORT=3001
UI_PORT=3050

# Security
JWT_SECRET=your-jwt-secret-here
API_SECRET=your-api-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password

# Agent Configuration (if deploying agent separately)
AGENT_API_KEY=your-agent-api-key
MYSQL_TARGET_HOST=localhost
MYSQL_TARGET_PORT=3306
MYSQL_TARGET_USER=optimizer
MYSQL_TARGET_PASSWORD=your-mysql-password
MYSQL_TARGET_DATABASE=your-database-name
```

### Secrets Management

For production environments, use a secrets management solution like:
- HashiCorp Vault
- AWS Secrets Manager
- Kubernetes Secrets
- Docker secrets

### SSL/TLS Configuration

For production deployment, configure SSL/TLS using Let's Encrypt:

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Configure reverse proxy**:
   Update your Nginx configuration to use SSL.

## Database Setup

### PostgreSQL Installation and Configuration

1. **Install PostgreSQL 16**:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Configure PostgreSQL**:
   ```bash
   sudo -u postgres psql
   ALTER USER postgres PASSWORD 'your-postgres-password';
   \q
   ```

3. **Create database schema**:
   ```bash
   psql -U postgres -d mysql_optimizer -f database_schema.sql
   ```

### Running Migrations

The SaaS API service includes database migrations. Run them automatically during deployment:

```bash
cd saas-api
npm run migrate
```

### Backup Strategy

Implement regular database backups:

1. **Daily backups**:
   ```bash
   pg_dump -U optimizer_user mysql_optimizer > backup_$(date +%Y%m%d).sql
   ```

2. **Automated backup script**:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/var/backups/mysql-optimizer"
   DATE=$(date +%Y%m%d_%H%M%S)
   pg_dump -U optimizer_user mysql_optimizer > $BACKUP_DIR/backup_$DATE.sql
   find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
   ```

## Service Configuration

### SaaS API Configuration

The SaaS API service requires proper configuration for production:

1. **Environment variables**:
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://optimizer_user:optimizer_password@postgres:5432/mysql_optimizer
   JWT_SECRET=your-jwt-secret-here
   API_SECRET=your-api-secret-here
   ```

2. **Health checks**:
   ```bash
   curl http://localhost:3001/health
   ```

### Admin UI Configuration

The Admin UI requires specific configuration for production:

1. **Environment variables**:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   API_SECRET=your-api-secret-here
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-admin-password
   ```

2. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

### Agent Configuration

The MySQL agent requires specific configuration for each target database:

1. **Environment variables**:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=optimizer
   DB_PASSWORD=your-mysql-password
   DB_DATABASE=your-database-name
   API_URL=http://saas-api:3001
   API_KEY=your-agent-api-key
   MAX_EXECUTION_TIME=5000
   THROTTLE_DELAY=100
   TOP_N_QUERIES=100
   ```

## Security Hardening

### Firewall Rules

Configure firewall to allow only necessary connections:

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow PostgreSQL
sudo ufw allow 5432/tcp

# Allow API ports
sudo ufw allow 3001/tcp
sudo ufw allow 3050/tcp

# Deny all other connections
sudo ufw default deny incoming
```

### SSL Certificates

Use Let's Encrypt for SSL certificates:

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Authentication Configuration

The system implements multiple authentication layers:

1. **API Authentication**:
   - API secret header for all requests
   - JWT-based authentication for admin UI

2. **Admin UI Authentication**:
   - Basic authentication middleware
   - Username/password credentials

### Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
// Example rate limiting middleware
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', apiLimiter);
```

## Monitoring & Logging

### Health Checks

All services include health check endpoints:

```bash
# SaaS API health check
curl http://localhost:3001/health

# Admin UI health check
curl http://localhost:3050/health

# PostgreSQL health check
pg_isready -U optimizer_user -d mysql_optimizer
```

### Log Management

Configure centralized logging:

1. **Log rotation**:
   ```bash
   # /etc/logrotate.d/mysql-optimizer
   /var/log/mysql-optimizer/*.log {
       daily
       rotate 7
       compress
       delaycompress
       missingok
       notifempty
   }
   ```

2. **Log aggregation**:
   - Use ELK stack (Elasticsearch, Logstash, Kibana)
   - Use Fluentd or Filebeat for log collection

### Metrics Collection

Collect metrics for performance monitoring:

1. **Application metrics**:
   - Response times
   - Error rates
   - Throughput

2. **Database metrics**:
   - Query performance
   - Connection pool usage
   - Resource utilization

### Alerting Setup

Configure alerting for critical issues:

1. **Email alerts**:
   ```bash
   # Using mail command
   echo "Critical issue detected" | mail -s "MySQL Optimizer Alert" admin@example.com
   ```

2. **Monitoring tools**:
   - Prometheus + Grafana
   - New Relic
   - Datadog

## Backup & Recovery

### Database Backup Procedures

1. **Full database backup**:
   ```bash
   pg_dump -U optimizer_user mysql_optimizer > full_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Incremental backup**:
   ```bash
   pg_dump -U optimizer_user -t table_name mysql_optimizer > incremental_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

### Disaster Recovery Plan

1. **Recovery steps**:
   - Restore database from latest backup
   - Restart all services
   - Verify service health

2. **Recovery time objective (RTO)**:
   - 2 hours for full recovery

3. **Recovery point objective (RPO)**:
   - 15 minutes of data loss

### Data Retention Policy

1. **Log retention**:
   - 30 days for application logs
   - 90 days for audit logs

2. **Database backup retention**:
   - 7 days for daily backups
   - 30 days for weekly backups
   - 1 year for monthly backups

## Maintenance

### Update Procedures

1. **Update services**:
   ```bash
   git pull origin main
   docker-compose pull
   docker-compose up -d
   ```

2. **Database migrations**:
   ```bash
   cd saas-api
   npm run migrate
   ```

### Rollback Procedures

1. **Rollback service**:
   ```bash
   docker-compose stop service-name
   docker-compose pull service-name:previous-version
   docker-compose up -d service-name
   ```

2. **Database rollback**:
   ```bash
   # Restore from backup
   psql -U optimizer_user mysql_optimizer < backup.sql
   ```

### Scaling Guidelines

1. **Horizontal scaling**:
   - Add more instances of SaaS API and Admin UI
   - Use load balancer for distribution

2. **Vertical scaling**:
   - Increase CPU and memory for PostgreSQL
   - Add more storage space

## Troubleshooting

### Common Issues and Solutions

1. **Service not starting**:
   - Check logs: `docker-compose logs service-name`
   - Verify environment variables
   - Check port conflicts

2. **Database connection issues**:
   - Verify PostgreSQL is running
   - Check connection string in environment variables
   - Confirm user permissions

3. **Authentication failures**:
   - Verify API secret
   - Check JWT token validity
   - Confirm admin credentials

### Debug Procedures

1. **Enable debug mode**:
   ```env
   NODE_ENV=development
   DEBUG=true
   ```

2. **Check service status**:
   ```bash
   docker-compose ps
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f service-name
   ```

### Support Contacts

For production support, contact:
- Primary: admin@example.com
- Secondary: support@example.com
- Phone: +1-234-567-8900