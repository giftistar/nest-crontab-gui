import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
@Controller()
export class AppController {
  @Get()
  root(@Res() res: Response) {
    const indexPath = join(process.cwd(), 'public', 'browser', 'index.html');
    return res.sendFile(indexPath);
  }

  // Catch-all route for SPA - must be last
  // This handles all routes that don't match other controllers
  @Get('*')
  serveAngular(@Req() req: Request, @Res() res: Response) {
    // Skip API routes, health checks, and swagger docs
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/health') || 
        req.path.startsWith('/swagger')) {
      return res.status(404).json({ message: 'Not Found' });
    }

    // Check if the requested file exists (for assets like JS, CSS, images)
    const filePath = join(process.cwd(), 'public', 'browser', req.path);
    if (existsSync(filePath) && !req.path.endsWith('/')) {
      return res.sendFile(filePath);
    }

    // For all other routes, serve the Angular app
    const indexPath = join(process.cwd(), 'public', 'browser', 'index.html');
    return res.sendFile(indexPath);
  }
}
