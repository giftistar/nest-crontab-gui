# Overview  
**Nest Crontab GUI** - A lightweight, web-based cron job scheduler built with NestJS that allows users to create and manage HTTP-based scheduled tasks with minimal setup. The service provides a simple GUI for managing cron jobs that can make GET/POST requests to external APIs with authentication headers. Built as a single Docker image for easy deployment, it targets developers and system administrators who need a straightforward scheduling solution without complex authentication or extensive logging requirements.

**Problem it solves:** Eliminates the need for traditional crontab configuration on servers and provides a visual interface for managing HTTP-based scheduled tasks with real-time monitoring.

**Target users:** Developers, DevOps engineers, and system administrators who need to schedule API calls, webhooks, or health checks.

**Value proposition:** Simple deployment, visual management, and focused functionality without bloat.

# Core Features  

## Cron Job Management
- **What it does:** Full CRUD operations for cron job entries
- **Why it's important:** Core functionality for managing scheduled tasks
- **How it works:** REST API endpoints with Angular frontend for creating, reading, updating, and deleting cron jobs

## HTTP Request Execution
- **What it does:** Executes GET/POST requests to specified URLs with custom headers and access tokens
- **Why it's important:** Enables integration with external APIs and services
- **How it works:** Node.js HTTP client makes requests based on cron schedule, supports Authorization headers

## Flexible Scheduling Support
- **What it does:** Supports both traditional crontab expressions and simple repeat intervals (5s, 10s, 1m, 1h, etc.)
- **Why it's important:** Provides user-friendly scheduling options for both complex and simple timing needs
- **How it works:** Custom parser that handles both "*/30 * * * * *" crontab format and "30s" repeat format

## Manual Trigger
- **What it does:** "Trigger Now" button for immediate job execution
- **Why it's important:** Allows testing and immediate execution without waiting for schedule
- **How it works:** Bypass scheduler and execute job immediately via API call

## Request Logging
- **What it does:** Logs all HTTP request results including response body and error messages with 3-day retention
- **Why it's important:** Provides complete visibility into job execution for debugging and monitoring
- **How it works:** SQLite database stores full response data with automatic cleanup of logs older than 3 days

## Single Docker Deployment
- **What it does:** Complete application packaged as one Docker image
- **Why it's important:** Simplifies deployment and eliminates dependency management
- **How it works:** Multi-stage Docker build with Node.js backend and Angular frontend served from same container

# User Experience  

## User Personas
**Primary Persona:** DevOps Engineer
- Needs to schedule API health checks and webhook calls
- Values simplicity and quick deployment
- Prefers visual interfaces over command-line configuration

**Secondary Persona:** Backend Developer  
- Needs to trigger periodic data synchronization
- Requires immediate testing capabilities
- Wants minimal operational overhead

## Key User Flows

### Creating a Cron Job
1. User accesses web interface
2. Clicks "Create New Job" 
3. Fills form: name, URL, method (GET/POST), headers, schedule
4. Chooses schedule type: Traditional cron or Simple repeat
5. For cron: enters expression like "0 */5 * * * *" (every 5 minutes)
6. For repeat: enters format like "30s", "2m", "1h" (every 30 seconds, 2 minutes, 1 hour)
7. Validates schedule expression
8. Saves and activates job

### Monitoring Job Execution
1. User views job list with status indicators
2. Clicks on specific job to view details
3. Reviews execution logs for past 3 days including full response bodies
4. Sees success/failure rates, response times, and error details
5. Can expand/collapse response body content for readability

### Manual Job Execution
1. User navigates to job details
2. Clicks "Trigger Now" button
3. Sees immediate execution result
4. Log entry created with manual trigger indicator

## UI/UX Considerations
- Clean, minimal interface focused on functionality
- Real-time status updates for job execution
- Color-coded success/failure indicators
- Mobile-responsive design for monitoring on-the-go
- No authentication required - suitable for internal networks

# Technical Architecture  

## System Components
- **Frontend:** Angular 17+ SPA served as static files
- **Backend:** NestJS framework with TypeScript
- **Database:** SQLite with TypeORM for job definitions and logs
- **Scheduler:** @nestjs/schedule with custom interval service
- **HTTP Client:** Axios via NestJS HttpModule for making scheduled requests

## Data Models

### CronJob Entity
```typescript
@Entity()
export class CronJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ type: 'varchar', enum: ['GET', 'POST'] })
  method: 'GET' | 'POST';

  @Column('json')
  headers: Record<string, string>;

  @Column()
  schedule: string; // Either crontab format or repeat format

  @Column({ type: 'varchar', enum: ['cron', 'repeat'] })
  scheduleType: 'cron' | 'repeat';

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### ExecutionLog Entity
```typescript
@Entity()
export class ExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @ManyToOne(() => CronJob)
  job: CronJob;

  @Column()
  executedAt: Date;

  @Column({ type: 'varchar', enum: ['success', 'error'] })
  status: 'success' | 'error';

  @Column()
  responseCode: number;

  @Column()
  responseTime: number;

  @Column('text')
  responseBody: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: false })
  triggeredManually: boolean;
}
```

## APIs and Integrations
- **NestJS REST API:**
  - CronJobController: GET/POST/PUT/DELETE /api/jobs
  - JobExecutionController: POST /api/jobs/:id/trigger
  - LogsController: GET /api/jobs/:id/logs
- **Services:**
  - SchedulerService: Manages job scheduling with @nestjs/schedule
  - HttpClientService: Executes HTTP requests
  - LogCleanupService: Automated 3-day log retention
- **External:** HTTP requests to user-defined endpoints
- **No external dependencies** for core functionality

## Infrastructure Requirements
- **Runtime:** Docker container with Node.js 18+
- **Framework:** NestJS application
- **Storage:** SQLite database file with TypeORM (persistent volume)
- **Memory:** ~256MB RAM minimum (NestJS overhead)
- **Network:** HTTP port (configurable, default 4000)
- **Platform:** Any Docker-compatible environment

# Development Roadmap  

## Phase 1: MVP Core (Foundation)
- **Scope:** Basic CRUD for cron jobs with simple repeat intervals using NestJS
- **Components:**
  - NestJS project setup with TypeScript
  - SQLite + TypeORM configuration for job and log entities
  - CronJobController with basic CRUD endpoints
  - Simple repeat interval parsing service (5s, 1m, 1h format)
  - Basic SchedulerService using @nestjs/schedule
  - Simple Angular component for job list/create/edit
  - Basic HTTP request execution (GET only) via HttpService
  - Response body logging to database via LogsService
  - Docker container setup with NestJS build

## Phase 2: Enhanced Scheduling
- **Scope:** Traditional crontab support and POST requests with NestJS architecture
- **Components:**
  - Crontab expression parsing and validation service
  - Enhanced SchedulerService supporting both interval and cron scheduling
  - Dual schedule type UI (toggle between cron/repeat)
  - POST request support with body handling in HttpClientService
  - Header configuration UI with validation
  - Access token management in frontend
  - NestJS validation pipes for schedule formats
  - Enhanced schedule form validation for both formats

## Phase 3: Monitoring & Logs
- **Scope:** Enhanced logging with full response data and monitoring dashboard
- **Components:**
  - Complete ExecutionLog implementation with response body storage
  - Log retention cleanup job (3-day limit)
  - Job execution history view with expandable response content
  - Success/failure status indicators
  - Response time tracking and error message display
  - Log search and filtering capabilities

## Phase 4: Manual Triggers & Polish
- **Scope:** Manual execution and NestJS-specific improvements
- **Components:**
  - JobExecutionController with manual trigger endpoints
  - Real-time status updates via WebSocket (NestJS Gateway)
  - NestJS exception filters for improved error handling
  - Global validation pipes and interceptors
  - Mobile-responsive UI improvements
  - NestJS-optimized Docker build with multi-stage builds

## Phase 5: Deployment Ready
- **Scope:** Production hardening with NestJS best practices
- **Components:**
  - NestJS health check module (terminus)
  - Environment configuration with @nestjs/config
  - Swagger API documentation generation
  - NestJS logging with winston integration
  - Docker compose example with volume persistence
  - README and deployment documentation
  - NestJS graceful shutdown handling

# Logical Dependency Chain

## Foundation First
1. **NestJS Project Setup** → TypeScript-based framework with dependency injection
2. **Database Schema** → TypeORM entities for Job and Log models with response body field
3. **Schedule Parser Service** → Support repeat format (5s, 1m, 1h) for immediate usability
4. **Basic REST Controllers** → CRUD operations with NestJS decorators and validation
5. **Simple Frontend** → Angular components consuming NestJS API

## Rapid Feedback Loop
6. **SchedulerService** → Get job execution working with @nestjs/schedule and repeat intervals
7. **HttpClientService** → HTTP functionality with response logging via NestJS HttpModule
8. **Job Status Display** → Visual feedback with response body preview

## Feature Completion  
9. **Traditional Cron Support** → Add crontab expression parsing to SchedulerService
10. **POST Support** → Expand HTTP capabilities in HttpClientService
11. **Header Configuration** → Enable authentication with validation pipes
12. **Enhanced Logging UI** → Full response body viewing and search
13. **Manual Triggers** → JobExecutionController for immediate execution
14. **NestJS Production Features** → Health checks, Swagger docs, proper logging

# Risks and Mitigations  

## Technical Challenges
- **Risk:** NestJS dependency injection complexity for scheduling services
- **Mitigation:** Use @nestjs/schedule module patterns, implement clean service separation for scheduler logic

- **Risk:** TypeORM relationship management between jobs and logs
- **Mitigation:** Use proper entity relationships with eager/lazy loading, implement repository pattern

- **Risk:** Response body storage causing database bloat
- **Mitigation:** Implement response size limits (e.g., 10KB max), truncate large responses, aggressive 3-day cleanup

- **Risk:** SQLite locking issues with concurrent access
- **Mitigation:** Use WAL mode and connection pooling; consider PostgreSQL for high-load scenarios

## MVP Definition Risks
- **Risk:** Over-engineering with NestJS features (guards, interceptors, pipes)
- **Mitigation:** Start with basic controllers and services, add NestJS features incrementally as needed

- **Risk:** TypeScript complexity slowing initial development
- **Mitigation:** Use simple DTOs and entities initially, add advanced typing later

## Resource Constraints
- **Risk:** NestJS learning curve extending development timeline
- **Mitigation:** Use NestJS CLI generators, follow official documentation patterns, start with basic features

- **Risk:** Docker image size with NestJS and TypeScript compilation
- **Mitigation:** Multi-stage builds with alpine base images, production-only dependencies

# Appendix  

## Research Findings
- @nestjs/schedule provides excellent integration with cron and interval scheduling
- TypeORM with SQLite offers robust entity management and query capabilities
- NestJS HttpModule wraps Axios with dependency injection and observables
- NestJS CLI generators significantly speed up controller/service/module creation
- WebSocket Gateway in NestJS enables real-time status updates efficiently

## Technical Specifications
- **Framework:** NestJS with TypeScript, Express adapter
- **ORM:** TypeORM with SQLite database
- **Schedule Formats:** 
  - Repeat: "5s", "10s", "1m", "5m", "1h", "2h" (supports s/m/h suffixes)
  - Crontab: Standard 6-field format "* * * * * *" (second minute hour day month dayOfWeek)
- **Response Logging:** Full response body stored, truncated at 10KB limit
- **HTTP Timeout:** 30 seconds default, configurable via @nestjs/config
- **Log Cleanup:** Daily cleanup service removes entries >3 days old
- **API Documentation:** Auto-generated Swagger docs at /api endpoint
- **Port Configuration:** Environment variable PORT (default 4000)
- **Database Location:** Configurable via DB_PATH environment variable

## Example Docker Usage
```bash
docker run -d \
  --name nest-crontab-gui \
  -p 4000:4000 \
  -v /host/data:/app/data \
  -e PORT=4000 \
  -e DB_PATH=/app/data/crontab.db \
  -e NODE_ENV=production \
  nest-crontab-gui:latest
```

## NestJS Module Structure
```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({...}),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    HttpModule
  ],
  controllers: [CronJobController, LogsController],
  providers: [SchedulerService, HttpClientService, LogCleanupService]
})
export class AppModule {}
```