import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronJobController } from './cronjob.controller';
import { JobExecutionController } from './job-execution.controller';
import { LogsController } from './logs.controller';
import { HealthController } from './health.controller';
import { ServicesModule } from '../services/services.module';
import { CronJob } from '../entities/cronjob.entity';
import { ExecutionLog } from '../entities/execution-log.entity';

@Module({
  imports: [
    ServicesModule,
    TypeOrmModule.forFeature([CronJob, ExecutionLog]),
  ],
  controllers: [
    CronJobController, 
    JobExecutionController, 
    LogsController,
    HealthController
  ],
})
export class ControllersModule {}