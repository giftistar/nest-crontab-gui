import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleParserService } from './schedule-parser.service';
import { ScheduleType } from '../entities/cronjob.entity';

describe('ScheduleParserService', () => {
  let service: ScheduleParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleParserService],
    }).compile();

    service = module.get<ScheduleParserService>(ScheduleParserService);
  });

  describe('parseRepeatInterval', () => {
    it('should parse valid seconds format', () => {
      const result = service.parseRepeatInterval('5s');
      expect(result.isValid).toBe(true);
      expect(result.interval).toBe(5000);
    });

    it('should parse valid minutes format', () => {
      const result = service.parseRepeatInterval('1m');
      expect(result.isValid).toBe(true);
      expect(result.interval).toBe(60000);
    });

    it('should parse valid hours format', () => {
      const result = service.parseRepeatInterval('2h');
      expect(result.isValid).toBe(true);
      expect(result.interval).toBe(7200000);
    });

    it('should parse valid days format', () => {
      const result = service.parseRepeatInterval('1d');
      expect(result.isValid).toBe(true);
      expect(result.interval).toBe(86400000);
    });

    it('should reject intervals less than 5 seconds', () => {
      const result = service.parseRepeatInterval('3s');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Minimum interval is 5 seconds');
    });

    it('should reject intervals greater than 30 days', () => {
      const result = service.parseRepeatInterval('31d');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Maximum interval is 30 days');
    });

    it('should reject invalid formats', () => {
      const result = service.parseRepeatInterval('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Invalid repeat format');
    });
  });

  describe('validateCronExpression', () => {
    it('should validate correct cron expressions', () => {
      const expressions = [
        '* * * * *',
        '0 * * * *',
        '0 0 * * *',
        '0 0 * * 0',
        '*/5 * * * *',
        '0 0 1 * *',
        '30 2 * * 1-5',
      ];

      expressions.forEach((expr) => {
        const result = service.validateCronExpression(expr);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid cron expressions', () => {
      const expressions = [
        'invalid',
        '60 * * * *',
        '* 25 * * *',
        '* * 32 * *',
        '* * * 13 *',
        '* * * * 8',
      ];

      expressions.forEach((expr) => {
        const result = service.validateCronExpression(expr);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBeDefined();
      });
    });
  });

  describe('validateSchedule', () => {
    it('should validate repeat schedule', () => {
      const result = service.validateSchedule('10s', ScheduleType.REPEAT);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe(ScheduleType.REPEAT);
      expect(result.interval).toBe(10000);
      expect(result.nextExecutionTime).toBeDefined();
    });

    it('should validate cron schedule', () => {
      const result = service.validateSchedule('0 * * * *', ScheduleType.CRON);
      expect(result.isValid).toBe(true);
      expect(result.type).toBe(ScheduleType.CRON);
      expect(result.cronExpression).toBe('0 * * * *');
      expect(result.nextExecutionTime).toBeDefined();
    });

    it('should reject empty schedule', () => {
      const result = service.validateSchedule('', ScheduleType.CRON);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('cannot be empty');
    });
  });

  describe('getNextExecutionTime', () => {
    it('should calculate next execution for repeat schedule', () => {
      const next = service.getNextExecutionTime('10s', ScheduleType.REPEAT);
      expect(next).toBeDefined();
      expect(next!.getTime()).toBeGreaterThan(Date.now());
      expect(next!.getTime()).toBeLessThanOrEqual(Date.now() + 10000);
    });

    it('should calculate next execution for cron schedule', () => {
      const next = service.getNextExecutionTime('0 * * * *', ScheduleType.CRON);
      expect(next).toBeDefined();
      expect(next!.getMinutes()).toBe(0);
    });

    it('should return null for invalid schedule', () => {
      const next = service.getNextExecutionTime('invalid', ScheduleType.CRON);
      expect(next).toBeNull();
    });
  });

  describe('getUpcomingExecutions', () => {
    it('should get multiple upcoming executions for repeat schedule', () => {
      const executions = service.getUpcomingExecutions('10s', ScheduleType.REPEAT, 3);
      expect(executions).toHaveLength(3);
      
      // Check intervals are correct
      for (let i = 1; i < executions.length; i++) {
        const diff = executions[i].getTime() - executions[i - 1].getTime();
        expect(diff).toBe(10000);
      }
    });

    it('should get multiple upcoming executions for cron schedule', () => {
      const executions = service.getUpcomingExecutions('0 * * * *', ScheduleType.CRON, 3);
      expect(executions).toHaveLength(3);
      
      // All should be at minute 0
      executions.forEach((exec) => {
        expect(exec.getMinutes()).toBe(0);
      });
    });
  });

  describe('formatRepeatInterval', () => {
    it('should format seconds correctly', () => {
      expect(service.formatRepeatInterval(5000)).toBe('every 5 seconds');
      expect(service.formatRepeatInterval(1000)).toBe('every 1 second');
    });

    it('should format minutes correctly', () => {
      expect(service.formatRepeatInterval(60000)).toBe('every 1 minute');
      expect(service.formatRepeatInterval(180000)).toBe('every 3 minutes');
    });

    it('should format hours correctly', () => {
      expect(service.formatRepeatInterval(3600000)).toBe('every 1 hour');
      expect(service.formatRepeatInterval(7200000)).toBe('every 2 hours');
    });

    it('should format days correctly', () => {
      expect(service.formatRepeatInterval(86400000)).toBe('every 1 day');
      expect(service.formatRepeatInterval(172800000)).toBe('every 2 days');
    });
  });

  describe('getScheduleDescription', () => {
    it('should describe repeat schedules', () => {
      expect(service.getScheduleDescription('5s', ScheduleType.REPEAT))
        .toBe('every 5 seconds');
      expect(service.getScheduleDescription('1h', ScheduleType.REPEAT))
        .toBe('every 1 hour');
    });

    it('should describe common cron patterns', () => {
      expect(service.getScheduleDescription('* * * * *', ScheduleType.CRON))
        .toBe('every minute');
      expect(service.getScheduleDescription('0 * * * *', ScheduleType.CRON))
        .toBe('every hour');
      expect(service.getScheduleDescription('0 0 * * *', ScheduleType.CRON))
        .toBe('daily at midnight');
    });

    it('should return raw cron for complex patterns', () => {
      expect(service.getScheduleDescription('*/15 * * * *', ScheduleType.CRON))
        .toBe('cron: */15 * * * *');
    });
  });
});