import { Injectable, NotFoundException, BadRequestException, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronJob } from '../entities/cronjob.entity';
import { Tag } from '../entities/tag.entity';
import { CreateCronJobDto } from '../dto/create-cronjob.dto';
import { UpdateCronJobDto } from '../dto/update-cronjob.dto';
import { ScheduleParserService } from './schedule-parser.service';
import { SchedulerService } from './scheduler.service';

@Injectable()
export class CronJobService {
  private readonly logger = new Logger(CronJobService.name);

  constructor(
    @InjectRepository(CronJob)
    private readonly cronJobRepository: Repository<CronJob>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly scheduleParser: ScheduleParserService,
    @Optional()
    @Inject(forwardRef(() => SchedulerService))
    private readonly schedulerService?: SchedulerService,
  ) {}

  /**
   * Find all cron jobs with optional tag filter
   */
  async findAll(tagIds?: string[]): Promise<CronJob[]> {
    try {
      const queryBuilder = this.cronJobRepository
        .createQueryBuilder('cronjob')
        .leftJoinAndSelect('cronjob.tags', 'tag');

      if (tagIds && tagIds.length > 0) {
        queryBuilder
          .innerJoin('cronjob.tags', 'filterTag')
          .where('filterTag.id IN (:...tagIds)', { tagIds });
      }

      return await queryBuilder
        .orderBy('cronjob.createdAt', 'DESC')
        .getMany();
    } catch (error) {
      this.logger.error(`Failed to fetch cron jobs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find a single cron job by ID
   */
  async findOne(id: string): Promise<CronJob> {
    try {
      const job = await this.cronJobRepository.findOne({
        where: { id },
        relations: ['executionLogs'],
      });

      if (!job) {
        throw new NotFoundException(`Cron job with ID "${id}" not found`);
      }

      return job;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch cron job ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new cron job
   */
  async create(createCronJobDto: CreateCronJobDto): Promise<CronJob> {
    try {
      // Validate the schedule format
      const validation = this.scheduleParser.validateSchedule(
        createCronJobDto.schedule,
        createCronJobDto.scheduleType,
      );

      if (!validation.isValid) {
        throw new BadRequestException(
          `Invalid schedule: ${validation.errorMessage}`,
        );
      }

      // Validate headers if provided
      if (createCronJobDto.headers) {
        try {
          JSON.parse(createCronJobDto.headers);
        } catch (error) {
          throw new BadRequestException('Headers must be valid JSON');
        }
      }

      // Extract tagIds from DTO
      const { tagIds, ...jobData } = createCronJobDto;
      
      // Create the job entity
      const cronJob = this.cronJobRepository.create({
        ...jobData,
        isActive: createCronJobDto.isActive ?? true,
      });
      
      // Handle tags if provided
      if (tagIds && tagIds.length > 0) {
        const tags = await this.tagRepository.find({
          where: tagIds.map(id => ({ id }))
        });
        cronJob.tags = tags;
      }
      
      const savedJob = await this.cronJobRepository.save(cronJob);
      
      this.logger.log(`Created cron job: ${savedJob.id} - ${savedJob.name}`);
      
      // Register job with scheduler if active
      if (savedJob.isActive && this.schedulerService) {
        try {
          await this.schedulerService.registerJob(savedJob);
        } catch (error) {
          this.logger.error(`Failed to register job with scheduler: ${error.message}`);
        }
      }
      
      return savedJob;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create cron job: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create cron job: ${error.message}`);
    }
  }

  /**
   * Update an existing cron job
   */
  async update(id: string, updateCronJobDto: UpdateCronJobDto): Promise<CronJob> {
    try {
      // First check if the job exists
      const existingJob = await this.findOne(id);

      // If schedule or scheduleType is being updated, validate
      if (updateCronJobDto.schedule || updateCronJobDto.scheduleType) {
        const scheduleToValidate = updateCronJobDto.schedule || existingJob.schedule;
        const scheduleTypeToValidate = updateCronJobDto.scheduleType || existingJob.scheduleType;
        
        const validation = this.scheduleParser.validateSchedule(
          scheduleToValidate,
          scheduleTypeToValidate,
        );

        if (!validation.isValid) {
          throw new BadRequestException(
            `Invalid schedule: ${validation.errorMessage}`,
          );
        }
      }

      // Validate headers if provided
      if (updateCronJobDto.headers) {
        try {
          JSON.parse(updateCronJobDto.headers);
        } catch (error) {
          throw new BadRequestException('Headers must be valid JSON');
        }
      }

      // Extract tagIds from DTO
      const { tagIds, ...updateData } = updateCronJobDto;
      
      // Update the job basic data
      await this.cronJobRepository.update(id, updateData);
      
      // Handle tags if provided
      if (tagIds !== undefined) {
        const job = await this.cronJobRepository.findOne({ where: { id }, relations: ['tags'] });
        if (job) {
          if (tagIds.length > 0) {
            const tags = await this.tagRepository.find({
              where: tagIds.map(id => ({ id }))
            });
            job.tags = tags;
          } else {
            job.tags = [];
          }
          await this.cronJobRepository.save(job);
        }
      }

      // Fetch and return the updated job
      const updatedJob = await this.findOne(id);
      
      this.logger.log(`Updated cron job: ${id} - ${updatedJob.name}`);
      
      // Update scheduler registration
      if (this.schedulerService) {
        try {
          await this.schedulerService.updateJob(id);
        } catch (error) {
          this.logger.error(`Failed to update job in scheduler: ${error.message}`);
        }
      }
      
      return updatedJob;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update cron job ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update cron job: ${error.message}`);
    }
  }

  /**
   * Remove a cron job
   */
  async remove(id: string): Promise<void> {
    try {
      // First check if the job exists
      await this.findOne(id);

      // Remove from scheduler first
      if (this.schedulerService) {
        try {
          this.schedulerService.removeJob(id);
        } catch (error) {
          this.logger.error(`Failed to remove job from scheduler: ${error.message}`);
        }
      }

      // Delete the job (execution logs will be cascade deleted)
      const result = await this.cronJobRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Cron job with ID "${id}" not found`);
      }

      this.logger.log(`Deleted cron job: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete cron job ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find jobs by status
   */
  async findByStatus(isActive: boolean): Promise<CronJob[]> {
    try {
      return await this.cronJobRepository.find({
        where: { isActive },
        order: {
          createdAt: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch jobs by status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Toggle job active status
   */
  async toggleStatus(id: string): Promise<CronJob> {
    try {
      const job = await this.findOne(id);
      job.isActive = !job.isActive;
      
      const updatedJob = await this.cronJobRepository.save(job);
      
      this.logger.log(`Toggled status for job ${id}: isActive = ${updatedJob.isActive}`);
      
      // Update scheduler registration based on new status
      if (this.schedulerService) {
        try {
          if (updatedJob.isActive) {
            await this.schedulerService.enableJob(id);
          } else {
            await this.schedulerService.disableJob(id);
          }
        } catch (error) {
          this.logger.error(`Failed to update job in scheduler: ${error.message}`);
        }
      }
      
      return updatedJob;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to toggle job status ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }
}