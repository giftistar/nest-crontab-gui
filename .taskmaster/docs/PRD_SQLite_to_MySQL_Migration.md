# Product Requirements Document (PRD)
## SQLite to MySQL Database Migration with Tag Management System

### 1. Executive Summary

**Project Name:** NestJS Crontab GUI - SQLite to MySQL Migration with Tag Management  
**Document Version:** 2.0  
**Date:** January 2025  
**Author:** Technical Team  
**Status:** Draft

This PRD outlines the requirements and implementation plan for migrating the NestJS Crontab GUI application from SQLite to MySQL database system, along with implementing a comprehensive tagging system for job organization. The migration aims to improve scalability, concurrent access performance, and enterprise deployment readiness, while the tagging system enhances job organization and filtering capabilities.

---

### 2. Background & Context

#### Current State
- **Database:** SQLite 3.x
- **ORM:** TypeORM 0.3.26
- **Application:** NestJS-based cron job management system
- **Data Location:** Local file system (`data/database.sqlite`)
- **Entities:** 2 primary entities (CronJob, ExecutionLog)
- **Job Organization:** Currently no categorization or tagging system

#### Business Drivers
- **Scalability Requirements:** SQLite limitations for concurrent writes becoming bottleneck
- **Enterprise Deployment:** Need for centralized database management
- **High Availability:** Requirements for replication and clustering
- **Performance:** Better handling of concurrent job executions and logging
- **Job Organization:** Need for better job categorization and filtering through tags
- **Operational Efficiency:** Requirement to group and manage related jobs efficiently

---

### 3. Objectives & Goals

#### Primary Objectives
1. **Migrate from SQLite to MySQL** without data loss or service disruption
2. **Implement comprehensive tagging system** for job organization
3. **Maintain backward compatibility** with existing API contracts
4. **Support both databases** during transition period
5. **Zero downtime migration** for production environments
6. **Enable efficient job filtering** through tag-based queries

#### Success Metrics
- 100% data integrity post-migration
- < 5 minutes migration execution time for databases up to 10GB
- Zero API breaking changes
- Performance improvement of 3x for concurrent operations
- Support for 100+ concurrent connections
- Sub-second tag filtering for 10,000+ jobs
- Support for unlimited tags per job with efficient querying

---

### 4. Functional Requirements

#### 4.1 Database Configuration
- **Multi-Database Support**
  - Support configuration switching between SQLite and MySQL
  - Environment-based database selection
  - Connection pooling configuration for MySQL

#### 4.2 Schema Migration
- **Entity Compatibility**
  - Convert SQLite-specific column types to MySQL equivalents
  - Handle UUID generation differences
  - Adjust datetime handling for MySQL

#### 4.3 Data Migration
- **Migration Tool**
  - Automated data export from SQLite
  - Data transformation pipeline
  - Batch import to MySQL with progress tracking
  - Rollback capability

#### 4.4 Feature Parity
- All existing features must work identically with MySQL:
  - Cron job CRUD operations
  - Execution logging
  - Concurrent job execution
  - Historical data queries

#### 4.5 Tag Management System
- **Tag Entity Management**
  - Create, read, update, delete tags
  - Unique tag names with optional color coding
  - Tag usage statistics and counts
  - Bulk tag operations support

- **Job-Tag Relationship**
  - Many-to-many relationship between jobs and tags
  - Attach multiple tags to a single job
  - Remove tags from jobs without affecting other relationships
  - Cascade handling for tag deletion

- **Tag-Based Filtering**
  - Filter jobs by single tag
  - Filter jobs by multiple tags (AND/OR operations)
  - Search tags with autocomplete
  - Sort jobs by tag count or tag names

- **Tag UI Components**
  - Tag input with autocomplete in job forms
  - Tag chip display on job cards
  - Tag filter dropdown/multi-select in job list
  - Tag management interface for administrators
  - Tag color picker for visual organization

---

### 5. Technical Requirements

#### 5.1 Database Specifications

**MySQL Requirements:**
- Version: MySQL 8.0+ or MariaDB 10.5+
- Character Set: utf8mb4
- Collation: utf8mb4_unicode_ci
- Storage Engine: InnoDB
- Connection Limit: 150 connections minimum

#### 5.2 TypeORM Configuration Changes

**Current SQLite Configuration:**
```typescript
{
  type: 'sqlite',
  database: 'data/database.sqlite',
  entities: [CronJob, ExecutionLog, Tag],
  synchronize: true,
  logging: process.env.NODE_ENV === 'development'
}
```

**Target MySQL Configuration:**
```typescript
{
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'crontab_gui',
  entities: [CronJob, ExecutionLog, Tag],
  synchronize: false,
  migrations: ['dist/migrations/*.js'],
  migrationsRun: true,
  logging: process.env.NODE_ENV === 'development',
  extra: {
    connectionLimit: 10,
    connectTimeout: 60000
  }
}
```

#### 5.3 Entity Modifications

**Required Changes:**
1. **UUID Handling**
   - SQLite: Uses TEXT for UUID
   - MySQL: Native UUID support or CHAR(36)

2. **DateTime Fields**
   - SQLite: `datetime` type
   - MySQL: `DATETIME` or `TIMESTAMP`

3. **Text Fields**
   - Review TEXT vs MEDIUMTEXT vs LONGTEXT requirements

4. **Indexes**
   - Optimize index definitions for MySQL query planner

#### 5.4 Tag System Technical Specifications

**New Entities:**

1. **Tag Entity**
```typescript
@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  @Index()
  name: string;

  @Column({ length: 7, nullable: true })
  color?: string; // Hex color code

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => CronJob, job => job.tags)
  jobs: CronJob[];
}
```

2. **Junction Table (cronjob_tags)**
```sql
CREATE TABLE cronjob_tags (
  jobId VARCHAR(36) NOT NULL,
  tagId VARCHAR(36) NOT NULL,
  PRIMARY KEY (jobId, tagId),
  INDEX idx_job (jobId),
  INDEX idx_tag (tagId),
  FOREIGN KEY (jobId) REFERENCES cronjobs(id) ON DELETE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);
```

3. **CronJob Entity Update**
```typescript
@Entity('cronjobs')
export class CronJob {
  // ... existing fields ...
  
  @ManyToMany(() => Tag, tag => tag.jobs, {
    cascade: ['insert', 'update'],
    eager: true
  })
  @JoinTable({
    name: 'cronjob_tags',
    joinColumn: { name: 'jobId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: Tag[];
}
```

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | List all tags with usage count |
| POST | `/api/tags` | Create new tag |
| PUT | `/api/tags/:id` | Update tag (name, color) |
| DELETE | `/api/tags/:id` | Delete tag |
| GET | `/api/jobs?tags=tag1,tag2` | Filter jobs by tags |
| GET | `/api/jobs?tagsMode=AND\|OR` | Tag filter mode |
| POST | `/api/jobs/:id/tags` | Attach tags to job |
| DELETE | `/api/jobs/:id/tags/:tagId` | Remove tag from job |
| GET | `/api/tags/search?q=query` | Search tags with autocomplete |

**Performance Considerations:**
- Index on tag.name for fast lookups
- Composite index on junction table for efficient joins
- Eager loading of tags with jobs to reduce N+1 queries
- Cache popular tags for autocomplete
- Limit tags per job to 20 for UI performance

#### 5.5 Migration Scripts

**Required Scripts:**
1. `migrate:generate` - Generate TypeORM migrations
2. `migrate:run` - Execute pending migrations
3. `migrate:revert` - Rollback last migration
4. `data:export` - Export SQLite data to JSON (including tags)
5. `data:import` - Import JSON data to MySQL (including tags)
6. `data:validate` - Verify data integrity post-migration
7. `tags:migrate` - Migrate any existing categorization to tags
8. `tags:validate` - Validate tag relationships integrity

---

### 6. Implementation Plan

#### Phase 1: Preparation (Week 1)
- [ ] Set up MySQL development environment
- [ ] Create database configuration service
- [ ] Implement environment-based database switching
- [ ] Update entity definitions for MySQL compatibility
- [ ] Design Tag entity and relationships
- [ ] Create Tag repository and service layers

#### Phase 2: Migration & Tag Development (Week 2)
- [ ] Create TypeORM migration files for existing entities
- [ ] Create Tag entity migration files
- [ ] Implement Tag management API endpoints
- [ ] Develop tag filtering logic for job queries
- [ ] Create tag UI components (chips, autocomplete, filters)
- [ ] Develop data export/import utilities (including tags)
- [ ] Implement data transformation logic
- [ ] Build validation and verification tools

#### Phase 3: Testing (Week 3)
- [ ] Unit tests for MySQL repositories
- [ ] Unit tests for Tag service and repository
- [ ] Integration tests for all endpoints (including tag endpoints)
- [ ] Test tag filtering performance with large datasets
- [ ] Test many-to-many relationship cascades
- [ ] Performance benchmarking
- [ ] Load testing with concurrent operations
- [ ] Data integrity validation

#### Phase 4: Deployment Strategy (Week 4)
- [ ] Staging environment migration
- [ ] Test tag system in staging
- [ ] Production migration rehearsal
- [ ] Rollback procedure documentation
- [ ] Production deployment
- [ ] Post-deployment tag system monitoring

---

### 7. Dependencies & Risks

#### Dependencies
- **npm packages to add:**
  - `mysql2`: MySQL driver for Node.js
  - `@nestjs/config`: Enhanced configuration management
  
#### Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | High | Low | Comprehensive backup strategy, validation tools |
| Performance degradation | Medium | Medium | Extensive load testing, query optimization |
| Incompatible SQL queries | Medium | High | Query abstraction layer, thorough testing |
| Connection pool exhaustion | High | Low | Proper pool configuration, monitoring |
| Character encoding issues | Low | Medium | UTF8MB4 enforcement, data validation |
| Tag relationship integrity | Medium | Low | Foreign key constraints, cascade rules |
| Tag filtering performance | Medium | Medium | Proper indexing, query optimization |
| Tag UI complexity | Low | Medium | Progressive enhancement, user testing |

---

### 8. Testing Strategy

#### 8.1 Test Coverage Requirements
- Unit Tests: 90% code coverage
- Integration Tests: All API endpoints
- E2E Tests: Critical user flows
- Performance Tests: Concurrent operation scenarios

#### 8.2 Test Scenarios
1. **Data Migration Integrity**
   - Verify record counts match
   - Validate data field accuracy
   - Check foreign key relationships

2. **Functional Testing**
   - CRUD operations for all entities (including tags)
   - Tag management operations (create, update, delete)
   - Job-tag association and disassociation
   - Tag-based job filtering (single and multiple tags)
   - Tag autocomplete functionality
   - Cron job execution flows
   - Concurrent job handling
   - Historical log queries

3. **Performance Testing**
   - 100 concurrent job executions
   - 10,000 log entries insertion
   - Tag filtering with 1000+ tags and 10,000+ jobs
   - Complex query performance with tag joins
   - Tag autocomplete response time (<100ms)
   - Bulk tag operations performance
   - Connection pool behavior

4. **Failure Scenarios**
   - Database connection loss
   - Migration rollback
   - Partial migration recovery
   - Tag deletion with active job associations
   - Orphaned tag relationships cleanup

---

### 9. Monitoring & Observability

#### Key Metrics to Monitor
- Database connection pool usage
- Query execution times
- Migration progress and status
- Data integrity checks
- Error rates and types
- Tag filtering query performance
- Tag usage statistics
- Tag-job relationship counts

#### Logging Requirements
- Migration process detailed logs
- Data transformation audit trail
- Performance metrics collection
- Error and warning capture

---

### 10. Documentation Requirements

#### Developer Documentation
- Migration setup guide
- Tag system implementation guide
- Configuration reference
- Tag API endpoint documentation
- Troubleshooting guide
- API changes documentation

#### Operations Documentation
- Deployment procedures
- Backup and restore processes
- Monitoring setup
- Incident response playbook

---

### 11. Rollback Plan

#### Rollback Triggers
- Data corruption detected
- Performance below acceptable thresholds
- Critical functionality failure
- Unrecoverable migration errors

#### Rollback Procedure
1. Stop application services
2. Backup current MySQL state
3. Restore SQLite database from backup
4. Revert application configuration
5. Restart services with SQLite
6. Verify system functionality

---

### 12. Success Criteria

The migration will be considered successful when:
- ✅ All data successfully migrated with 100% integrity
- ✅ Application functions identically with MySQL
- ✅ Tag system fully operational with all features
- ✅ Tag filtering performs within sub-second response time
- ✅ Performance metrics meet or exceed targets
- ✅ Zero downtime achieved during migration
- ✅ All tests pass with MySQL backend
- ✅ Documentation complete and verified
- ✅ Rollback procedure tested and validated

---

### 13. Appendices

#### A. Database Schema Comparison

| Field Type | SQLite | MySQL |
|------------|--------|-------|
| UUID | TEXT | CHAR(36) or BINARY(16) |
| Boolean | INTEGER (0/1) | BOOLEAN or TINYINT(1) |
| DateTime | TEXT or INTEGER | DATETIME or TIMESTAMP |
| Text | TEXT | TEXT, MEDIUMTEXT, LONGTEXT |
| Enum | TEXT with CHECK | ENUM or VARCHAR |

#### B. Environment Variables

```bash
# Database Configuration
DB_TYPE=mysql              # sqlite or mysql
DB_HOST=localhost         
DB_PORT=3306             
DB_USERNAME=crontab_user  
DB_PASSWORD=secure_password
DB_NAME=crontab_gui       
DB_SYNCHRONIZE=false      
DB_LOGGING=false          
DB_POOL_SIZE=10           

# Migration Settings
MIGRATION_BATCH_SIZE=1000
MIGRATION_TIMEOUT=300000
MIGRATION_VALIDATE=true
```

#### C. Tag System Schema

**Tags Table:**
```sql
CREATE TABLE tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7),
  usageCount INT DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tag_name (name)
);
```

**Junction Table:**
```sql
CREATE TABLE cronjob_tags (
  jobId VARCHAR(36) NOT NULL,
  tagId VARCHAR(36) NOT NULL,
  PRIMARY KEY (jobId, tagId),
  INDEX idx_job (jobId),
  INDEX idx_tag (tagId),
  FOREIGN KEY (jobId) REFERENCES cronjobs(id) ON DELETE CASCADE,
  FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### D. Sample Tag API Requests

```bash
# Create a tag
POST /api/tags
{
  "name": "production",
  "color": "#FF0000"
}

# Attach tags to a job
POST /api/jobs/{jobId}/tags
{
  "tagIds": ["tag-uuid-1", "tag-uuid-2"]
}

# Filter jobs by tags
GET /api/jobs?tags=production,critical&tagsMode=AND

# Search tags with autocomplete
GET /api/tags/search?q=prod
```

#### E. Sample Migration Commands

```bash
# Development
npm run migrate:sqlite-to-mysql -- --env=development --validate=true

# Production with tag migration
npm run migrate:sqlite-to-mysql -- --env=production --backup=true --validate=true --rollback-on-error=true --include-tags=true

# Tag-specific migration
npm run tags:migrate -- --source=sqlite --target=mysql --validate=true
```

---

### 14. Approval & Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Database Administrator | | | |
| QA Lead | | | |
| DevOps Lead | | | |

---

**Document Status:** Ready for Review  
**Next Review Date:** [To be scheduled]  
**Distribution:** Development Team, Operations Team, Product Management