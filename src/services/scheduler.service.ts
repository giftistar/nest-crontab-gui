import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob as NestCronJob } from 'cron';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob, ScheduleType, ExecutionMode } from '../entities/cronjob.entity';
import { HttpClientService } from './http-client.service';
import { ScheduleParserService } from './schedule-parser.service';

export enum JobStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  ERROR = 'error',
}

interface JobRegistry {
  job: CronJob;
  status: JobStatus;
  lastRun?: Date;
  nextRun?: Date;
  isExecuting: boolean;
  runningCount: number;
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly jobRegistry = new Map<string, JobRegistry>();
  private readonly runningJobs = new Set<string>();

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectRepository(CronJob)
    private readonly cronJobRepository: Repository<CronJob>,
    private readonly httpClientService: HttpClientService,
    private readonly scheduleParserService: ScheduleParserService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Scheduler Service');
    await this.loadActiveJobs();
  }

  onModuleDestroy() {
    this.logger.log('Shutting down Scheduler Service');
    this.removeAllJobs();
  }

  private async loadActiveJobs() {
    try {
      const activeJobs = await this.cronJobRepository.find({
        where: { isActive: true },
      });

      this.logger.log(`Loading ${activeJobs.length} active jobs`);

      for (const job of activeJobs) {
        try {
          await this.registerJob(job);
        } catch (error) {
          this.logger.error(`Failed to register job ${job.name}: ${error.message}`);
        }
      }

      this.logger.log('All active jobs loaded successfully');
    } catch (error) {
      this.logger.error(`Failed to load active jobs: ${error.message}`);
    }
  }

  async registerJob(job: CronJob): Promise<void> {
    // Remove existing job if it exists
    if (this.jobRegistry.has(job.id)) {
      this.removeJob(job.id);
    }

    try {
      if (job.scheduleType === ScheduleType.CRON) {
        await this.addCronJob(job);
      } else if (job.scheduleType === ScheduleType.REPEAT) {
        await this.addIntervalJob(job);
      }

      this.jobRegistry.set(job.id, {
        job,
        status: JobStatus.IDLE,
        isExecuting: false,
        nextRun: this.calculateNextRun(job),
        runningCount: 0,
      });

      this.logger.log(`Job "${job.name}" (${job.id}) registered successfully`);
    } catch (error) {
      this.logger.error(`Failed to register job "${job.name}": ${error.message}`);
      throw error;
    }
  }

  private async addCronJob(job: CronJob): Promise<void> {
    const cronExpression = job.schedule;

    // Validate cron expression
    const isValid = await this.scheduleParserService.validateSchedule(
      cronExpression,
      ScheduleType.CRON,
    );

    if (!isValid) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const cronJob = new NestCronJob(cronExpression, async () => {
      await this.executeJob(job.id);
    });

    this.schedulerRegistry.addCronJob(job.id, cronJob);
    cronJob.start();

    this.logger.debug(`Cron job "${job.name}" scheduled with expression: ${cronExpression}`);
  }

  private async addIntervalJob(job: CronJob): Promise<void> {
    const intervalResult = await this.scheduleParserService.parseRepeatInterval(job.schedule);

    if (!intervalResult.isValid) {
      throw new Error(`Invalid repeat interval: ${intervalResult.errorMessage}`);
    }

    const callback = async () => {
      await this.executeJob(job.id);
    };

    const interval = setInterval(callback, intervalResult.interval);
    this.schedulerRegistry.addInterval(job.id, interval);

    this.logger.debug(`Interval job "${job.name}" scheduled every ${intervalResult.interval}ms`);
  }

  removeJob(jobId: string): void {
    try {
      // Check if it's a cron job
      if (this.schedulerRegistry.doesExist('cron', jobId)) {
        const cronJob = this.schedulerRegistry.getCronJob(jobId);
        cronJob.stop();
        this.schedulerRegistry.deleteCronJob(jobId);
        this.logger.debug(`Cron job ${jobId} removed`);
      }
    } catch (error) {
      // Job might not be a cron job
    }

    try {
      // Check if it's an interval job
      if (this.schedulerRegistry.doesExist('interval', jobId)) {
        this.schedulerRegistry.deleteInterval(jobId);
        this.logger.debug(`Interval job ${jobId} removed`);
      }
    } catch (error) {
      // Job might not be an interval job
    }

    // Remove from registry
    this.jobRegistry.delete(jobId);
    this.runningJobs.delete(jobId);
  }

  private removeAllJobs(): void {
    for (const jobId of this.jobRegistry.keys()) {
      this.removeJob(jobId);
    }
  }

  private async executeJob(jobId: string, triggeredManually: boolean = false): Promise<void> {
    const registryEntry = this.jobRegistry.get(jobId);
    if (!registryEntry) {
      this.logger.error(`Job ${jobId} not found in registry`);
      return;
    }

    // Reload job from database to get latest configuration
    const job = await this.cronJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.error(`Job ${jobId} not found in database`);
      this.removeJob(jobId);
      return;
    }

    if (!job.isActive) {
      this.logger.debug(`Job ${jobId} is not active, skipping execution`);
      return;
    }

    // Check execution mode and concurrent limits
    if (job.executionMode === ExecutionMode.SEQUENTIAL) {
      // Sequential mode: skip if already running
      if (registryEntry.runningCount > 0) {
        this.logger.warn(`Job ${jobId} is already running in sequential mode, skipping execution`);
        return;
      }
    } else if (job.executionMode === ExecutionMode.PARALLEL) {
      // Parallel mode: check max concurrent limit
      if (registryEntry.runningCount >= job.maxConcurrent) {
        this.logger.warn(`Job ${jobId} has reached max concurrent limit (${job.maxConcurrent}), skipping execution`);
        return;
      }
    }

    // Increment running count
    registryEntry.runningCount++;
    registryEntry.status = JobStatus.RUNNING;
    registryEntry.lastRun = new Date();

    // Update currentRunning in database
    await this.cronJobRepository.update(jobId, {
      currentRunning: registryEntry.runningCount,
    });

    this.logger.log(`Executing job "${job.name}" (${jobId}) - Running: ${registryEntry.runningCount}/${job.maxConcurrent}`);

    // Execute in a separate async context to allow parallel execution
    this.executeJobAsync(job, registryEntry, triggeredManually).catch(error => {
      this.logger.error(`Error in async job execution for "${job.name}": ${error.message}`);
    });
  }

  private async executeJobAsync(
    job: CronJob,
    registryEntry: JobRegistry,
    triggeredManually: boolean,
  ): Promise<void> {
    try {
      // Execute HTTP request
      const result = await this.httpClientService.executeRequest(job, triggeredManually);

      // Update job statistics
      await this.cronJobRepository.update(job.id, {
        lastExecutedAt: new Date(),
        executionCount: job.executionCount + 1,
      });

      this.logger.log(
        `Job "${job.name}" executed ${result.status === 'success' ? 'successfully' : 'with errors'}${triggeredManually ? ' (manually triggered)' : ''} - Running: ${registryEntry.runningCount}/${job.maxConcurrent}`,
      );
    } catch (error) {
      this.logger.error(`Error executing job "${job.name}": ${error.message}`);
    } finally {
      // Decrement running count
      registryEntry.runningCount--;
      
      // Update status based on running count
      if (registryEntry.runningCount === 0) {
        registryEntry.status = JobStatus.IDLE;
        registryEntry.isExecuting = false;
      }

      // Update currentRunning in database
      await this.cronJobRepository.update(job.id, {
        currentRunning: registryEntry.runningCount,
      });

      registryEntry.nextRun = this.calculateNextRun(job);
    }
  }

  private calculateNextRun(job: CronJob): Date | undefined {
    try {
      if (job.scheduleType === ScheduleType.CRON) {
        const nextRun = this.scheduleParserService.getNextExecutionTime(job.schedule, ScheduleType.CRON);
        return nextRun ?? undefined;
      } else if (job.scheduleType === ScheduleType.REPEAT) {
        const intervalResult = this.scheduleParserService.parseRepeatInterval(job.schedule);
        if (intervalResult.isValid) {
          return new Date(Date.now() + intervalResult.interval);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to calculate next run for job ${job.id}: ${error.message}`);
    }
    return undefined;
  }

  // Public methods for job lifecycle management

  async updateJob(jobId: string): Promise<void> {
    const job = await this.cronJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Remove old schedule
    this.removeJob(jobId);

    // Register with new schedule if active
    if (job.isActive) {
      await this.registerJob(job);
    }
  }

  async enableJob(jobId: string): Promise<void> {
    const job = await this.cronJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (!this.jobRegistry.has(jobId)) {
      await this.registerJob(job);
    }
  }

  async disableJob(jobId: string): Promise<void> {
    this.removeJob(jobId);
  }

  getJobStatus(jobId: string): JobRegistry | undefined {
    return this.jobRegistry.get(jobId);
  }

  getAllJobStatuses(): Map<string, JobRegistry> {
    return new Map(this.jobRegistry);
  }

  isJobRunning(jobId: string): boolean {
    return this.runningJobs.has(jobId);
  }

  async executeJobManually(jobId: string): Promise<void> {
    await this.executeJob(jobId, true);
  }
}