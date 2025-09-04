import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CronJob } from '../entities/cronjob.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DataMigrationService {
  constructor(
    @InjectRepository(CronJob)
    private cronJobRepository: Repository<CronJob>,
    
    private dataSource: DataSource,
  ) {}

  async exportAllData(): Promise<any> {
    const [cronJobs] = await Promise.all([
      this.cronJobRepository.find({}),
  
    ]);

    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        counts: {
          cronJobs: cronJobs.length
        },
      },
      data: {
        cronJobs
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

}