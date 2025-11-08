import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { validateEnvironmentOrThrow } from './config/env.validation';

async function bootstrap() {
  // Validate environment variables before starting
  validateEnvironmentOrThrow();
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security - Helmet with relaxed CORS for file uploads
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false, // Dosya paylaşımı için tamamen kapat
  }));
  app.use(cookieParser());

  // CORS
  const corsOrigins = configService.get('CORS_ORIGIN', 'http://localhost:3000').split(',');
  const productionOrigins = [
    'https://app.asforces.com',
    'https://asforces.com',
    'https://www.asforces.com',
  ];
  
  app.enableCors({
    origin: (origin, callback) => {
      // Upload endpoints için tüm origin'lere izin ver
      const request = origin; // Current request origin
      callback(null, true); // Her zaman izin ver - interceptor'da kontrol edelim
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Versioning - Disabled (using /api prefix only)
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  // API Prefix
  const apiPrefix = configService.get('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AsforceS Voice API')
      .setDescription('API documentation for AsforceS Voice platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('accessToken')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('servers', 'Server management')
      .addTag('channels', 'Channel management')
      .addTag('messages', 'Messaging')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'AsforceS Voice API Docs',
      customfavIcon: 'https://www.asforces.com/favicon.ico',
    });
  }

  // Start server
  const port = configService.get('PORT', 3000);
  const host = configService.get('HOST', '0.0.0.0');

  await app.listen(port, host);

  console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║                                                        ║
  ║   🚀 AsforceS Voice API Server                        ║
  ║                                                        ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
  ║   Server:      http://${host}:${port}                   ║
  ║   API:         http://${host}:${port}/${apiPrefix}          ║
  ${process.env.NODE_ENV !== 'production' ? `║   Docs:        http://${host}:${port}/docs                   ║` : ''}
  ║                                                        ║
  ╚════════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
