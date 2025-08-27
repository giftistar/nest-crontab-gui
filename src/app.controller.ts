import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root(@Res() res: Response) {
    const indexPath = join(process.cwd(), 'public', 'browser', 'index.html');
    return res.sendFile(indexPath);
  }
}
