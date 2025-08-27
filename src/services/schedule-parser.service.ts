import { Injectable } from '@nestjs/common';
import { ScheduleType } from '../entities/cronjob.entity';
import { CronExpressionParser } from 'cron-parser';

export interface ParsedSchedule {
  type: ScheduleType;
  interval?: number;
  cronExpression?: string;
  isValid: boolean;
  errorMessage?: string;
  nextExecutionTime?: Date;
}

@Injectable()
export class ScheduleParserService {
  /**
   * Parse repeat interval format (e.g., '5s', '1m', '1h', '1d')
   * Returns interval in milliseconds
   */
  parseRepeatInterval(schedule: string): { interval: number; isValid: boolean; errorMessage?: string } {
    const trimmed = schedule.trim().toLowerCase();
    const match = trimmed.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      return {
        interval: 0,
        isValid: false,
        errorMessage: 'Invalid repeat format. Use formats like: 5s, 1m, 1h, 1d',
      };
    }

    const [, valueStr, unit] = match;
    const value = parseInt(valueStr, 10);

    if (value <= 0) {
      return {
        interval: 0,
        isValid: false,
        errorMessage: 'Interval value must be greater than 0',
      };
    }

    let interval: number;
    switch (unit) {
      case 's':
        interval = value * 1000;
        if (value < 5) {
          return {
            interval: 0,
            isValid: false,
            errorMessage: 'Minimum interval is 5 seconds',
          };
        }
        break;
      case 'm':
        interval = value * 60 * 1000;
        break;
      case 'h':
        interval = value * 60 * 60 * 1000;
        break;
      case 'd':
        interval = value * 24 * 60 * 60 * 1000;
        if (value > 30) {
          return {
            interval: 0,
            isValid: false,
            errorMessage: 'Maximum interval is 30 days',
          };
        }
        break;
      default:
        return {
          interval: 0,
          isValid: false,
          errorMessage: 'Unknown time unit',
        };
    }

    return {
      interval,
      isValid: true,
    };
  }

  /**
   * Validate cron expression using cron-parser
   */
  validateCronExpression(expression: string): { isValid: boolean; errorMessage?: string } {
    try {
      // Validate the expression
      CronExpressionParser.parse(expression);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Invalid cron expression: ${error.message}`,
      };
    }
  }

  /**
   * Main validation method that determines schedule type and validates accordingly
   */
  validateSchedule(schedule: string, scheduleType: ScheduleType): ParsedSchedule {
    if (!schedule || !schedule.trim()) {
      return {
        type: scheduleType,
        isValid: false,
        errorMessage: 'Schedule cannot be empty',
      };
    }

    if (scheduleType === ScheduleType.REPEAT) {
      const result = this.parseRepeatInterval(schedule);
      return {
        type: ScheduleType.REPEAT,
        interval: result.interval,
        isValid: result.isValid,
        errorMessage: result.errorMessage,
        nextExecutionTime: result.isValid 
          ? new Date(Date.now() + result.interval) 
          : undefined,
      };
    } else if (scheduleType === ScheduleType.CRON) {
      const result = this.validateCronExpression(schedule);
      let nextExecutionTime: Date | undefined;
      
      if (result.isValid) {
        try {
          const interval = CronExpressionParser.parse(schedule);
          nextExecutionTime = interval.next().toDate();
        } catch (error) {
          // Should not happen if validation passed
        }
      }

      return {
        type: ScheduleType.CRON,
        cronExpression: schedule,
        isValid: result.isValid,
        errorMessage: result.errorMessage,
        nextExecutionTime,
      };
    }

    return {
      type: scheduleType,
      isValid: false,
      errorMessage: 'Unknown schedule type',
    };
  }

  /**
   * Calculate the next execution time for a given schedule
   */
  getNextExecutionTime(schedule: string, scheduleType: ScheduleType, lastExecutionTime?: Date): Date | null {
    const parsed = this.validateSchedule(schedule, scheduleType);
    
    if (!parsed.isValid) {
      return null;
    }

    if (scheduleType === ScheduleType.REPEAT && parsed.interval) {
      const baseTime = lastExecutionTime ? lastExecutionTime.getTime() : Date.now();
      return new Date(baseTime + parsed.interval);
    }

    if (scheduleType === ScheduleType.CRON) {
      try {
        const options = lastExecutionTime 
          ? { currentDate: lastExecutionTime }
          : undefined;
        const interval = CronExpressionParser.parse(schedule, options);
        return interval.next().toDate();
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  /**
   * Get multiple upcoming execution times
   */
  getUpcomingExecutions(
    schedule: string, 
    scheduleType: ScheduleType, 
    count: number = 5
  ): Date[] {
    const executions: Date[] = [];
    
    if (scheduleType === ScheduleType.REPEAT) {
      const parsed = this.parseRepeatInterval(schedule);
      if (parsed.isValid && parsed.interval) {
        let nextTime = Date.now();
        for (let i = 0; i < count; i++) {
          nextTime += parsed.interval;
          executions.push(new Date(nextTime));
        }
      }
    } else if (scheduleType === ScheduleType.CRON) {
      try {
        const interval = CronExpressionParser.parse(schedule);
        for (let i = 0; i < count; i++) {
          executions.push(interval.next().toDate());
        }
      } catch (error) {
        // Return empty array if invalid
      }
    }

    return executions;
  }

  /**
   * Convert repeat interval to human-readable format
   */
  formatRepeatInterval(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `every ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `every ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `every ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `every ${seconds} second${seconds > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get human-readable description of the schedule
   */
  getScheduleDescription(schedule: string, scheduleType: ScheduleType): string {
    if (scheduleType === ScheduleType.REPEAT) {
      const parsed = this.parseRepeatInterval(schedule);
      if (parsed.isValid && parsed.interval) {
        return this.formatRepeatInterval(parsed.interval);
      }
    } else if (scheduleType === ScheduleType.CRON) {
      try {
        // Try to provide a human-readable description
        const interval = CronExpressionParser.parse(schedule);
        const fields = interval.fields;
        
        // Simple common patterns
        if (schedule === '* * * * *') return 'every minute';
        if (schedule === '0 * * * *') return 'every hour';
        if (schedule === '0 0 * * *') return 'daily at midnight';
        if (schedule === '0 12 * * *') return 'daily at noon';
        if (schedule === '0 0 * * 0') return 'weekly on Sunday';
        if (schedule === '0 0 1 * *') return 'monthly on the 1st';
        
        // Return the raw expression for complex patterns
        return `cron: ${schedule}`;
      } catch (error) {
        return 'invalid schedule';
      }
    }
    
    return 'unknown schedule';
  }
}