import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CronJobService } from '../services/cronjob.service';
import { CreateCronJobDto } from '../dto/create-cronjob.dto';
import { UpdateCronJobDto } from '../dto/update-cronjob.dto';
import { CronJob } from '../entities/cronjob.entity';
import { DataMigrationService } from '../services/data-migration.service';

@ApiTags('CronJobs')
@Controller('api/jobs')
export class CronJobController {
  private readonly logger = new Logger(CronJobController.name);

  constructor(
    private readonly cronJobService: CronJobService,
    private readonly dataMigrationService: DataMigrationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all cron jobs',
    description: 'Retrieve a list of all cron jobs, optionally filtered by status',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of cron jobs retrieved successfully',
    type: [CronJob],
  })
  async findAll(@Query('isActive') isActive?: string): Promise<CronJob[]> {
    this.logger.log(`GET /api/jobs - isActive: ${isActive}`);
    
    if (isActive !== undefined) {
      const activeStatus = isActive === 'true';
      return this.cronJobService.findByStatus(activeStatus);
    }
    
    return this.cronJobService.findAll();
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export all cron jobs',
    description: 'Export all cron jobs data in JSON format',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cron jobs exported successfully',
  })
  async exportJobs(): Promise<any> {
    this.logger.log('GET /api/jobs/export');
    return this.dataMigrationService.exportAllData();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a cron job by ID',
    description: 'Retrieve a single cron job by its UUID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the cron job',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cron job retrieved successfully',
    type: CronJob,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cron job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CronJob> {
    this.logger.log(`GET /api/jobs/${id}`);
    return this.cronJobService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new cron job',
    description: 'Create a new cron job with the specified configuration',
  })
  @ApiBody({
    type: CreateCronJobDto,
    description: 'Cron job creation data',
    examples: {
      cron: {
        summary: 'Cron schedule example',
        value: {
          name: 'Health Check',
          url: 'https://api.example.com/health',
          method: 'GET',
          schedule: '*/5 * * * *',
          scheduleType: 'cron',
          headers: '{"Authorization": "Bearer token"}',
          isActive: true,
        },
      },
      repeat: {
        summary: 'Repeat schedule example',
        value: {
          name: 'Status Check',
          url: 'https://api.example.com/status',
          method: 'GET',
          schedule: '30s',
          scheduleType: 'repeat',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Cron job created successfully',
    type: CronJob,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createCronJobDto: CreateCronJobDto,
  ): Promise<CronJob> {
    this.logger.log(`POST /api/jobs - Creating job: ${createCronJobDto.name}`);
    return this.cronJobService.create(createCronJobDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a cron job',
    description: 'Update an existing cron job configuration',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the cron job',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateCronJobDto,
    description: 'Cron job update data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cron job updated successfully',
    type: CronJob,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cron job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or UUID format',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateCronJobDto: UpdateCronJobDto,
  ): Promise<CronJob> {
    this.logger.log(`PUT /api/jobs/${id}`);
    return this.cronJobService.update(id, updateCronJobDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a cron job',
    description: 'Delete an existing cron job and all its execution logs',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the cron job',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Cron job deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cron job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    this.logger.log(`DELETE /api/jobs/${id}`);
    await this.cronJobService.remove(id);
  }

  @Put(':id/toggle')
  @ApiOperation({
    summary: 'Toggle cron job status',
    description: 'Toggle the active status of a cron job',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID of the cron job',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cron job status toggled successfully',
    type: CronJob,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cron job not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  async toggleStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CronJob> {
    this.logger.log(`PUT /api/jobs/${id}/toggle`);
    return this.cronJobService.toggleStatus(id);
  }
}