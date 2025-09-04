import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CronJob } from '../entities/cronjob.entity';
import { ExecutionLog } from '../entities/execution-log.entity';
import { Tag } from '../entities/tag.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DataMigrationService {
  constructor(
    @InjectRepository(CronJob)
    private cronJobRepository: Repository<CronJob>,
    @InjectRepository(ExecutionLog)
    private executionLogRepository: Repository<ExecutionLog>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    private dataSource: DataSource,
  ) {}

  async exportAllData(): Promise<any> {
    const [cronJobs, tags] = await Promise.all([
      this.cronJobRepository.find({ relations: ['tags'] }),
      this.tagRepository.find(),
    ]);

    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        counts: {
          cronJobs: cronJobs.length,
          tags: tags.length,
        },
      },
      data: {
        cronJobs,
        tags,
      },
    };
  }

  async exportToFile(filePath?: string): Promise<string> {
    const data = await this.exportAllData();
    const exportPath = filePath || path.join(process.cwd(), 'exports', `export-${Date.now()}.json`);
    
    // Ensure exports directory exists
    const dir = path.dirname(exportPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(exportPath, JSON.stringify(data, null, 2));
    return exportPath;
  }

  async importData(data: any, options: { clearExisting?: boolean } = {}): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results: {
        imported: {
          tags: number;
          cronJobs: number;
        };
        errors: Array<{
          entity: string;
          data: any;
          error: string;
        }>;
      } = {
        imported: {
          tags: 0,
          cronJobs: 0,
        },
        errors: [],
      };

      // Clear existing data if requested
      if (options.clearExisting) {
        await queryRunner.manager.delete(CronJob, {});
        await queryRunner.manager.delete(Tag, {});
      }

      // Import tags first
      if (data.data?.tags) {
        for (const tag of data.data.tags) {
          try {
            const existingTag = await queryRunner.manager.findOne(Tag, {
              where: { name: tag.name },
            });

            if (!existingTag) {
              const newTag = queryRunner.manager.create(Tag, {
                ...tag,
                id: undefined, // Let database generate new ID
              });
              await queryRunner.manager.save(Tag, newTag);
              results.imported.tags++;
            }
          } catch (error) {
            results.errors.push({
              entity: 'tag',
              data: tag,
              error: error.message,
            });
          }
        }
      }

      // Import cron jobs
      if (data.data?.cronJobs) {
        for (const job of data.data.cronJobs) {
          try {
            const tagNames = job.tags?.map((t: any) => t.name) || [];
            const tags = await Promise.all(
              tagNames.map((name: string) =>
                queryRunner.manager.findOne(Tag, { where: { name } })
              )
            );

            const newJob = queryRunner.manager.create(CronJob, {
              ...job,
              id: undefined, // Let database generate new ID
              tags: tags.filter(t => t !== null),
              executionLogs: undefined, // Don't import logs with job
            });
            
            await queryRunner.manager.save(CronJob, newJob);
            results.imported.cronJobs++;
          } catch (error) {
            results.errors.push({
              entity: 'cronJob',
              data: job,
              error: error.message,
            });
          }
        }
      }


      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async importFromFile(filePath: string, options: { clearExisting?: boolean } = {}): Promise<any> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return await this.importData(data, options);
  }

  async validateImportData(data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return { valid: false, errors };
    }

    if (!data.metadata || !data.data) {
      errors.push('Missing metadata or data section');
    }

    if (data.data) {
      if (data.data.cronJobs && !Array.isArray(data.data.cronJobs)) {
        errors.push('cronJobs must be an array');
      }

      if (data.data.tags && !Array.isArray(data.data.tags)) {
        errors.push('tags must be an array');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}