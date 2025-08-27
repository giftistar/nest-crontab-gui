import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CronJob } from './entities/cronjob.entity';
import { ExecutionLog } from './entities/execution-log.entity';
import { ServicesModule } from './services/services.module';
import { ControllersModule } from './controllers/controllers.module';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH || path.join(process.cwd(), 'data', 'database.sqlite'),
      entities: [CronJob, ExecutionLog],
      synchronize: true, // Enable for initial setup, disable in real production
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 300000,
      maxRedirects: 5,
    }),
    ServicesModule,
    ControllersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
