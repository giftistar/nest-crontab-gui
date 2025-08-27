import { Injectable } from '@angular/core';
import { ScheduleType } from '../models/cronjob.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleValidatorService {
  
  constructor() { }

  validateSchedule(schedule: string, type: ScheduleType): { isValid: boolean; errorMessage?: string } {
    if (!schedule || !schedule.trim()) {
      return { isValid: false, errorMessage: 'Schedule cannot be empty' };
    }

    if (type === ScheduleType.REPEAT) {
      return this.validateRepeatSchedule(schedule);
    } else if (type === ScheduleType.CRON) {
      return this.validateCronExpression(schedule);
    }

    return { isValid: false, errorMessage: 'Invalid schedule type' };
  }

  private validateRepeatSchedule(schedule: string): { isValid: boolean; errorMessage?: string } {
    const trimmed = schedule.trim().toLowerCase();
    const match = trimmed.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      return {
        isValid: false,
        errorMessage: 'Invalid repeat format. Use formats like: 5s, 1m, 1h, 1d'
      };
    }

    const [, valueStr, unit] = match;
    const value = parseInt(valueStr, 10);

    if (value <= 0) {
      return {
        isValid: false,
        errorMessage: 'Interval value must be greater than 0'
      };
    }

    if (unit === 's' && value < 5) {
      return {
        isValid: false,
        errorMessage: 'Minimum interval is 5 seconds'
      };
    }

    if (unit === 'd' && value > 30) {
      return {
        isValid: false,
        errorMessage: 'Maximum interval is 30 days'
      };
    }

    return { isValid: true };
  }

  private validateCronExpression(expression: string): { isValid: boolean; errorMessage?: string } {
    // Basic validation for cron expression (5 fields)
    const parts = expression.trim().split(/\s+/);
    
    if (parts.length !== 5) {
      return {
        isValid: false,
        errorMessage: 'Cron expression must have 5 fields (minute hour day month weekday)'
      };
    }

    // Check each field for valid characters
    const validPattern = /^[\d,\-*/]+$/;
    for (const part of parts) {
      if (!validPattern.test(part) && part !== '*') {
        return {
          isValid: false,
          errorMessage: `Invalid characters in cron field: ${part}`
        };
      }
    }

    return { isValid: true };
  }

  getScheduleDescription(schedule: string, type: ScheduleType): string {
    if (type === ScheduleType.REPEAT) {
      const match = schedule.trim().toLowerCase().match(/^(\d+)(s|m|h|d)$/);
      if (match) {
        const [, value, unit] = match;
        const unitMap: { [key: string]: string } = {
          's': 'second',
          'm': 'minute',
          'h': 'hour',
          'd': 'day'
        };
        const unitName = unitMap[unit];
        return `Every ${value} ${unitName}${parseInt(value) > 1 ? 's' : ''}`;
      }
    } else if (type === ScheduleType.CRON) {
      // Common cron patterns
      if (schedule === '* * * * *') return 'Every minute';
      if (schedule === '0 * * * *') return 'Every hour';
      if (schedule === '0 0 * * *') return 'Daily at midnight';
      if (schedule === '0 12 * * *') return 'Daily at noon';
      if (schedule === '0 0 * * 0') return 'Weekly on Sunday';
      if (schedule === '0 0 1 * *') return 'Monthly on the 1st';
      if (schedule.match(/^\d+ \* \* \* \*$/)) {
        const minute = schedule.split(' ')[0];
        return `Every hour at minute ${minute}`;
      }
      if (schedule.match(/^\d+ \d+ \* \* \*$/)) {
        const [minute, hour] = schedule.split(' ');
        return `Daily at ${hour}:${minute.padStart(2, '0')}`;
      }
    }
    
    return schedule;
  }

  getScheduleExamples(type: ScheduleType): string[] {
    if (type === ScheduleType.REPEAT) {
      return [
        '5s - Every 5 seconds',
        '1m - Every minute',
        '30m - Every 30 minutes',
        '1h - Every hour',
        '1d - Every day'
      ];
    } else if (type === ScheduleType.CRON) {
      return [
        '* * * * * - Every minute',
        '*/5 * * * * - Every 5 minutes',
        '0 * * * * - Every hour',
        '0 0 * * * - Daily at midnight',
        '0 9 * * 1-5 - Weekdays at 9 AM'
      ];
    }
    return [];
  }
}