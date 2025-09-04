import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServicesModule } from './services/services.module';
import { ControllersModule } from './controllers/controllers.module';
import { DatabaseConfigService } from './services/database-config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [],
      useFactory: (databaseConfigService: DatabaseConfigService) => {
        return databaseConfigService.createTypeOrmOptions();
      },
      inject: [DatabaseConfigService],
      extraProviders: [DatabaseConfigService],
    }),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 300000,
      maxRedirects: 5,
    }),
    ServicesModule,
    ControllersModule,
  ],
  controllers: [], // AppController moved to ControllersModule to ensure proper route order
  providers: [AppService],
})
export class AppModule {}
