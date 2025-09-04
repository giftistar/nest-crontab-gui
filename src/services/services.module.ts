import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleParserService } from './schedule-parser.service';
import { CronJobService } from './cronjob.service';
import { HttpClientService } from './http-client.service';
import { SchedulerService } from './scheduler.service';
import { LogCleanupService } from './log-cleanup.service';
import { DataMigrationService } from './data-migration.service';
import { CronJob } from '../entities/cronjob.entity';
import { ExecutionLog } from '../entities/execution-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CronJob, ExecutionLog]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [
    ScheduleParserService, 
    CronJobService, 
    HttpClientService, 
    SchedulerService, 
    LogCleanupService,
    DataMigrationService,
  ],
  exports: [
    ScheduleParserService, 
    CronJobService, 
    HttpClientService, 
    SchedulerService, 
    LogCleanupService,
    DataMigrationService,
  ],
})
export class ServicesModule {}