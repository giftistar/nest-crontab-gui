# NestJS Crontab GUI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0+-red.svg)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular-17+-red.svg)](https://angular.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

A comprehensive web-based cron job management system built with NestJS backend and Angular frontend. Features a modern Material Design UI for creating, managing, and monitoring scheduled HTTP requests with real-time execution logs and health monitoring.

## Features

### 🚀 Core Functionality
- **Web-based Cron Management**: Intuitive interface for creating and managing cron jobs
- **Dual Schedule Types**: Support for traditional cron expressions and simple repeat intervals
- **HTTP Request Execution**: Execute GET and POST requests with custom headers and body
- **Real-time Monitoring**: Live execution logs with filtering and pagination
- **Health Checks**: Comprehensive health monitoring with system metrics
- **Auto Log Cleanup**: Configurable automatic cleanup of old execution logs

### 🎨 User Interface
- **Material Design**: Modern Angular Material UI components
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Live status updates and execution monitoring
- **Job Management**: Easy job creation, editing, and status toggling
- **Log Viewer**: Detailed execution logs with search and filtering

### 🔧 Technical Features
- **Multi-stage Docker Build**: Optimized production-ready Docker images
- **SQLite Database**: Lightweight, embedded database with TypeORM
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Health Monitoring**: Built-in health checks for Docker and Kubernetes
- **Graceful Shutdown**: Proper signal handling for container environments
- **Error Handling**: Comprehensive error handling and logging

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nest-crontab-gui
   ```

2. **Configure environment variables** (optional)
   ```bash
   cp .env.example .env
   # Edit .env file with your preferred settings
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web Interface: http://localhost:4000
   - API Documentation: http://localhost:4000/api/docs
   - Health Check: http://localhost:4000/health

### Using Docker

```bash
# Build the image
docker build -t nest-crontab-gui .

# Run the container
docker run -d \
  --name crontab-gui \
  -p 4000:4000 \
  -v crontab-data:/app/data \
  -e TZ=UTC \
  nest-crontab-gui
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Application environment |
| `PORT` | `4000` | Application port |
| `DB_PATH` | `/app/data/database.sqlite` | SQLite database file path |
| `LOG_RETENTION_DAYS` | `3` | Days to retain execution logs |
| `LOG_CLEANUP_ENABLED` | `true` | Enable automatic log cleanup |
| `LOG_LEVEL` | `info` | Application log level |
| `TZ` | `UTC` | Timezone for job execution |
| `CORS_ORIGINS` | `*` | CORS allowed origins (comma-separated) |
| `MAX_REQUEST_SIZE` | `10mb` | Maximum request body size |
| `REQUEST_TIMEOUT` | `40000` | HTTP request timeout (ms) |
| `MAX_CONCURRENT_JOBS` | `10` | Maximum concurrent job executions |
| `JOB_RETRY_COUNT` | `3` | Number of retry attempts for failed jobs |
| `JOB_RETRY_DELAY` | `1000` | Delay between retries (ms) |

## API Documentation

The application provides a comprehensive REST API documented with Swagger/OpenAPI.

### Base URL
- Development: `http://localhost:4000`
- API Base Path: `/api`

### Key Endpoints

#### Cron Jobs Management
```http
GET    /api/jobs              # List all jobs (with optional filtering)
POST   /api/jobs              # Create a new job
GET    /api/jobs/:id          # Get specific job details
PUT    /api/jobs/:id          # Update a job
DELETE /api/jobs/:id          # Delete a job
PUT    /api/jobs/:id/toggle   # Toggle job active status
```

#### Job Execution
```http
POST   /api/execution/:id/run        # Manually execute a job
GET    /api/execution/:id/logs       # Get execution logs for a job
GET    /api/execution/:id/status     # Get current execution status
```

#### Logs Management
```http
GET    /api/logs                     # Get all execution logs
GET    /api/logs/:jobId              # Get logs for specific job
DELETE /api/logs/cleanup             # Manually trigger log cleanup
```

#### Health & Monitoring
```http
GET    /health           # Comprehensive health check
GET    /health/live      # Liveness probe (simple)
GET    /health/ready     # Readiness probe (database check)
```

### API Documentation UI
Access the interactive Swagger UI at: `http://localhost:4000/api/docs`

## Job Configuration

### Schedule Types

#### 1. Cron Expressions
Traditional cron expressions with 5 or 6 fields:
```
# Field order: minute hour day month weekday [year]
*/5 * * * *          # Every 5 minutes
0 */2 * * *          # Every 2 hours
0 9 * * 1-5          # 9 AM on weekdays
0 0 1 * *            # First day of every month
0 0 * * 0            # Every Sunday at midnight
```

#### 2. Repeat Intervals
Simple interval format:
```
5s      # Every 5 seconds (minimum)
1m      # Every minute
1h      # Every hour
1d      # Every day
30d     # Every 30 days (maximum)
```

### Job Configuration Examples

#### Health Check Job
```json
{
  "name": "API Health Check",
  "description": "Monitor API health status",
  "url": "https://api.example.com/health",
  "method": "GET",
  "schedule": "*/5 * * * *",
  "scheduleType": "cron",
  "headers": "{\"User-Agent\": \"CronJob-HealthCheck/1.0\"}",
  "isActive": true
}
```

#### Data Sync Job
```json
{
  "name": "Daily Data Sync",
  "description": "Synchronize data with external service",
  "url": "https://api.example.com/sync",
  "method": "POST",
  "schedule": "0 2 * * *",
  "scheduleType": "cron",
  "headers": "{\"Authorization\": \"Bearer your-token\", \"Content-Type\": \"application/json\"}",
  "body": "{\"source\": \"cron\", \"timestamp\": \"{{timestamp}}\"}",
  "isActive": true
}
```

#### Simple Monitoring
```json
{
  "name": "Website Uptime Check",
  "description": "Check if website is accessible",
  "url": "https://example.com",
  "method": "GET",
  "schedule": "30s",
  "scheduleType": "repeat",
  "isActive": true
}
```

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### Local Development

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd nest-crontab-gui
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Start development servers**
   ```bash
   # Terminal 1: Start NestJS backend
   npm run start:dev
   
   # Terminal 2: Start Angular frontend
   cd frontend && npm start
   ```

3. **Access the application**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:4000
   - API Docs: http://localhost:4000/api/docs

### Building for Production

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Build backend
npm run build

# Start production server
npm run start:prod
```

### Testing

```bash
# Run backend tests
npm test
npm run test:e2e
npm run test:cov

# Run frontend tests
cd frontend && npm test
```

## Docker Deployment

### Production Deployment

#### Docker Compose (Recommended)
```yaml
version: '3.8'

services:
  crontab-gui:
    image: nest-crontab-gui:latest
    container_name: nest-crontab-gui
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - TZ=America/New_York
      - LOG_RETENTION_DAYS=7
    volumes:
      - crontab-data:/app/data
      - crontab-logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  crontab-data:
  crontab-logs:
```

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crontab-gui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: crontab-gui
  template:
    metadata:
      labels:
        app: crontab-gui
    spec:
      containers:
      - name: crontab-gui
        image: nest-crontab-gui:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: TZ
          value: "UTC"
        volumeMounts:
        - name: data
          mountPath: /app/data
        livenessProbe:
          httpGet:
            path: /health/live
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: crontab-data
---
apiVersion: v1
kind: Service
metadata:
  name: crontab-gui-service
spec:
  selector:
    app: crontab-gui
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
```

## Monitoring and Troubleshooting

### Health Checks

The application provides multiple health check endpoints:

1. **Comprehensive Health Check** (`/health`)
   - Database connectivity
   - System memory usage
   - Disk space availability
   - Application uptime
   - Active/total jobs count

2. **Liveness Probe** (`/health/live`)
   - Simple endpoint to verify the application is running

3. **Readiness Probe** (`/health/ready`)
   - Verifies database connectivity and readiness to serve requests

### Logging

The application uses structured logging with configurable levels:

```bash
# View Docker logs
docker logs -f nest-crontab-gui

# View logs with docker-compose
docker-compose logs -f crontab-gui

# Filter by log level in production
docker logs nest-crontab-gui 2>&1 | grep ERROR
```

### Common Issues

#### Database Issues
```bash
# Check if database file exists and is writable
docker exec nest-crontab-gui ls -la /app/data/

# Reset database (caution: will lose all jobs)
docker exec nest-crontab-gui rm /app/data/database.sqlite
docker restart nest-crontab-gui
```

#### Job Not Executing
1. Check job status: `GET /api/jobs/:id`
2. Verify schedule format and next execution time
3. Check execution logs: `GET /api/execution/:id/logs`
4. Ensure target URL is accessible from container

#### High Memory Usage
```bash
# Monitor container resources
docker stats nest-crontab-gui

# Check application health
curl http://localhost:4000/health

# Reduce log retention period
docker exec -e LOG_RETENTION_DAYS=1 nest-crontab-gui
```

### Performance Tuning

#### Database Optimization
- Regular log cleanup (automatic by default)
- Monitor database size growth
- Consider backup strategies for persistent data

#### Resource Limits
```yaml
# Docker Compose resource limits
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 256M
    reservations:
      cpus: '0.25'
      memory: 128M
```

## Security Considerations

### Production Security

1. **Environment Variables**
   - Never commit sensitive data to version control
   - Use secure secret management systems
   - Rotate API keys regularly

2. **Network Security**
   ```yaml
   # Restrict CORS origins in production
   environment:
     - CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

3. **Container Security**
   - Application runs as non-root user (nodejs:1001)
   - Read-only root filesystem support
   - Minimal attack surface with Alpine Linux

4. **Database Security**
   - SQLite database with proper file permissions
   - Regular database backups
   - Secure volume mounting

5. **Request Validation**
   - Input validation with class-validator
   - Request size limits
   - Timeout protections

### Security Headers
```bash
# Add security headers via reverse proxy (nginx example)
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow NestJS and Angular best practices
- Add tests for new features
- Update documentation
- Ensure Docker builds successfully
- Test in both development and production environments

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [API Documentation](http://localhost:4000/api/docs)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)

## Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Angular](https://angular.io/) - Frontend framework
- [Angular Material](https://material.angular.io/) - UI components
- [TypeORM](https://typeorm.io/) - Database ORM
- [Docker](https://www.docker.com/) - Containerization platform


  docker run -d -p 4000:4000 -v ./data:/app/data giftistar/nest-crontab-gui:0.0.1