import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from Angular build
  app.useStaticAssets(join(process.cwd(), 'public', 'browser'));
  app.setBaseViewsDir(join(process.cwd(), 'public', 'browser'));

  // Enable CORS
  app.enableCors();

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS Crontab GUI API')
    .setDescription('REST API for managing cron jobs with web interface. Supports both traditional cron expressions and simple repeat intervals.')
    .setVersion('1.0')
    .addTag('CronJobs', 'Manage cron jobs')
    .addTag('Execution', 'Job execution management')
    .addTag('Logs', 'Execution logs management')
    .setContact('API Support', 'https://github.com/your-repo', 'support@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(`http://localhost:${process.env.PORT ?? 4000}`, 'Development server')
    .addServer('https://api.example.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`Health check: http://localhost:${port}/health`);

  // Graceful shutdown handling
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR1', 'SIGUSR2'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Close the NestJS application
        await app.close();
        console.log('Application closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}
bootstrap();
