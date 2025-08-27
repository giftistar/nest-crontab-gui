import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ExecutionLog } from '../entities/execution-log.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LogCleanupService implements OnModuleInit {
  private readonly logger = new Logger(LogCleanupService.name);
  private retentionDays: number;
  private isEnabled: boolean;

  constructor(
    @InjectRepository(ExecutionLog)
    private readonly executionLogRepository: Repository<ExecutionLog>,
    private readonly configService: ConfigService,
  ) {
    // Get retention period from config or use default
    this.retentionDays = this.configService.get<number>('LOG_RETENTION_DAYS', 3);
    this.isEnabled = this.configService.get<boolean>('LOG_CLEANUP_ENABLED', true);
  }

  async onModuleInit() {
    this.logger.log(`Log cleanup service initialized with ${this.retentionDays} days retention`);
    
    // Run initial cleanup on startup
    if (this.isEnabled) {
      await this.performCleanup();
    }
  }

  /**
   * Schedule daily cleanup at midnight
   * Cron expression: 0 0 * * * (at 00:00:00 every day)
   */
  @Cron('0 0 * * *', {
    name: 'logCleanup',
    timeZone: process.env.TZ || 'UTC',
  })
  async handleCleanup() {
    if (!this.isEnabled) {
      this.logger.debug('Log cleanup is disabled');
      return;
    }

    await this.performCleanup();
  }

  /**
   * Perform the actual cleanup of old logs
   */
  async performCleanup(): Promise<{ deletedCount: number }> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    this.logger.log(`Starting log cleanup for logs older than ${cutoffDate.toISOString()}`);

    try {
      // Count logs to be deleted for logging
      const logsToDelete = await this.executionLogRepository.count({
        where: {
          executedAt: LessThan(cutoffDate),
        },
      });

      if (logsToDelete === 0) {
        this.logger.log('No old logs to delete');
        return { deletedCount: 0 };
      }

      // Delete old logs
      const deleteResult = await this.executionLogRepository.delete({
        executedAt: LessThan(cutoffDate),
      });

      const deletedCount = deleteResult.affected || 0;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Log cleanup completed: deleted ${deletedCount} logs older than ${this.retentionDays} days in ${duration}ms`,
      );

      // Optional: Get current log count for monitoring
      const remainingLogs = await this.executionLogRepository.count();
      this.logger.debug(`Remaining logs in database: ${remainingLogs}`);

      return { deletedCount };
    } catch (error) {
      this.logger.error(`Failed to cleanup old logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Manually trigger cleanup (useful for testing or admin endpoints)
   */
  async manualCleanup(retentionDays?: number): Promise<{ deletedCount: number; cutoffDate: Date }> {
    const days = retentionDays || this.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.logger.log(`Manual cleanup triggered for logs older than ${cutoffDate.toISOString()}`);

    try {
      const deleteResult = await this.executionLogRepository.delete({
        executedAt: LessThan(cutoffDate),
      });

      const deletedCount = deleteResult.affected || 0;

      this.logger.log(`Manual cleanup completed: deleted ${deletedCount} logs`);

      return { deletedCount, cutoffDate };
    } catch (error) {
      this.logger.error(`Failed to perform manual cleanup: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get cleanup configuration
   */
  getCleanupConfig(): { retentionDays: number; isEnabled: boolean; nextRunAt: Date } {
    // Calculate next midnight
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(0, 0, 0, 0);

    return {
      retentionDays: this.retentionDays,
      isEnabled: this.isEnabled,
      nextRunAt: nextRun,
    };
  }

  /**
   * Update cleanup configuration at runtime
   */
  updateConfig(retentionDays?: number, isEnabled?: boolean): void {
    if (retentionDays !== undefined && retentionDays > 0) {
      this.retentionDays = retentionDays;
      this.logger.log(`Updated retention period to ${retentionDays} days`);
    }

    if (isEnabled !== undefined) {
      this.isEnabled = isEnabled;
      this.logger.log(`Log cleanup ${isEnabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get statistics about logs that will be deleted
   */
  async getCleanupPreview(retentionDays?: number): Promise<{
    logsToDelete: number;
    oldestLog?: Date;
    cutoffDate: Date;
    sizeSaved?: string;
  }> {
    const days = retentionDays || this.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logsToDelete = await this.executionLogRepository.count({
      where: {
        executedAt: LessThan(cutoffDate),
      },
    });

    // Get oldest log
    const oldestLog = await this.executionLogRepository.findOne({
      where: {
        executedAt: LessThan(cutoffDate),
      },
      order: {
        executedAt: 'ASC',
      },
    });

    return {
      logsToDelete,
      oldestLog: oldestLog?.executedAt,
      cutoffDate,
    };
  }
}