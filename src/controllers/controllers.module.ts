import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronJobController } from './cronjob.controller';
import { JobExecutionController } from './job-execution.controller';
import { LogsController } from './logs.controller';
import { HealthController } from './health.controller';
import { TagController } from './tag.controller';
import { DataMigrationController } from './data-migration.controller';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { ServicesModule } from '../services/services.module';
import { CronJob } from '../entities/cronjob.entity';
import { ExecutionLog } from '../entities/execution-log.entity';
import { Tag } from '../entities/tag.entity';

@Module({
  imports: [
    ServicesModule,
    TypeOrmModule.forFeature([CronJob, ExecutionLog, Tag]),
  ],
  controllers: [
    // API controllers first
    CronJobController, 
    JobExecutionController, 
    LogsController,
    HealthController,
    TagController,
    DataMigrationController,
    // App controller with catch-all route must be last
    AppController,
  ],
  providers: [AppService],
})
export class ControllersModule {}