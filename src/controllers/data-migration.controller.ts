import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DataMigrationService } from '../services/data-migration.service';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('api/data')
export class DataMigrationController {
  constructor(private readonly dataMigrationService: DataMigrationService) {}

  @Get('export')
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="crontab-export.json"')
  async exportData(@Res() res: Response) {
    try {
      const data = await this.dataMigrationService.exportAllData();
      res.json(data);
    } catch (error) {
      throw new BadRequestException(`Export failed: ${error.message}`);
    }
  }

  @Post('import')
  async importData(
    @Body() data: any,
    @Body('clearExisting') clearExisting?: boolean,
  ) {
    try {
      // Validate the import data first
      const validation = await this.dataMigrationService.validateImportData(data);
      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Invalid import data',
          errors: validation.errors,
        });
      }

      const result = await this.dataMigrationService.importData(data, {
        clearExisting,
      });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  @Post('import/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './data',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JSON files are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async importFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('clearExisting') clearExisting?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.dataMigrationService.importFromFile(
        file.path,
        { clearExisting: clearExisting === 'true' },
      );

      // Clean up uploaded file
      const fs = require('fs/promises');
      await fs.unlink(file.path);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      // Clean up uploaded file on error
      const fs = require('fs/promises');
      await fs.unlink(file.path).catch(() => {});
      
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  @Post('validate')
  async validateImportData(@Body() data: any) {
    const validation = await this.dataMigrationService.validateImportData(data);
    return validation;
  }
}