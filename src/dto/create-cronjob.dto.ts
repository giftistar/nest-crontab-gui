import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUrl,
  IsJSON,
  IsNumber,
  Min,
  Max,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HttpMethod, ScheduleType } from '../entities/cronjob.entity';
import { Transform } from 'class-transformer';

// Custom validator for schedule format
export function IsValidSchedule(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidSchedule',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          
          if (!value || typeof value !== 'string') {
            return false;
          }

          if (obj.scheduleType === ScheduleType.REPEAT) {
            // Validate repeat format (e.g., '5s', '1m', '1h', '1d')
            const match = value.trim().toLowerCase().match(/^(\d+)(s|m|h|d)$/);
            if (!match) return false;
            
            const [, valueStr, unit] = match;
            const num = parseInt(valueStr, 10);
            
            if (num <= 0) return false;
            if (unit === 's' && num < 5) return false; // Min 5 seconds
            if (unit === 'd' && num > 30) return false; // Max 30 days
            
            return true;
          } else if (obj.scheduleType === ScheduleType.CRON) {
            // Basic cron expression validation
            // This is a simplified check - the actual validation will be done by cron-parser
            const cronParts = value.trim().split(' ');
            return cronParts.length === 5 || cronParts.length === 6;
          }
          
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          if (obj.scheduleType === ScheduleType.REPEAT) {
            return 'Schedule must be in format: 5s, 1m, 1h, 1d (min: 5s, max: 30d)';
          } else if (obj.scheduleType === ScheduleType.CRON) {
            return 'Schedule must be a valid cron expression (e.g., "0 * * * *")';
          }
          return 'Invalid schedule format';
        },
      },
    });
  };
}

export class CreateCronJobDto {
  @ApiProperty({
    description: 'Name of the cron job',
    example: 'Health Check',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the cron job',
    example: 'Checks the health status of the API every 5 minutes',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL to call',
    example: 'https://api.example.com/health',
  })
  @IsUrl({}, { message: 'URL must be a valid URL' })
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'HTTP method to use',
    enum: HttpMethod,
    example: HttpMethod.GET,
  })
  @IsEnum(HttpMethod, { message: 'Method must be GET or POST' })
  method: HttpMethod;

  @ApiPropertyOptional({
    description: 'HTTP headers as JSON string',
    example: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
  })
  @IsOptional()
  @IsJSON({ message: 'Headers must be valid JSON' })
  headers?: string;

  @ApiPropertyOptional({
    description: 'Request body for POST requests (JSON string)',
    example: '{"key": "value", "timestamp": 1234567890}',
  })
  @IsOptional()
  @ValidateIf((o) => o.method === HttpMethod.POST)
  @IsJSON({ message: 'Body must be valid JSON for POST requests' })
  body?: string;

  @ApiProperty({
    description: 'Schedule expression (cron or repeat format)',
    example: '*/5 * * * *',
  })
  @IsString()
  @IsNotEmpty()
  @IsValidSchedule()
  schedule: string;

  @ApiProperty({
    description: 'Type of schedule',
    enum: ScheduleType,
    example: ScheduleType.CRON,
  })
  @IsEnum(ScheduleType, { message: 'Schedule type must be "cron" or "repeat"' })
  scheduleType: ScheduleType;

  @ApiPropertyOptional({
    description: 'Whether the job is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Request timeout in milliseconds (1000-300000)',
    example: 30000,
    minimum: 1000,
    maximum: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000, { message: 'Request timeout must be at least 1000ms (1 second)' })
  @Max(300000, { message: 'Request timeout cannot exceed 300000ms (300 seconds)' })
  requestTimeout?: number;
}