import {
  ClassSerializerInterceptor,
  Logger,
  LogLevel,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { join } from 'path';
import * as express from 'express';
import { writeFileSync } from 'fs';
import * as YAML from 'yaml';

import { InternalModule } from 'src/internal/internal.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BackOfficeModule } from 'src/modules/backoffice/backoffice.module';
import { KycModule } from 'src/modules/kyc/kyc.module';
import { TransferModule } from 'src/modules/transfer/transfer.module';
import { AppModule } from 'src/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const dbUrl = configService.get('config.database.url');
  const port = configService.get('config.app.port') || 3000;
  const isLocal = dbUrl?.includes('localhost');
  const logLevels: LogLevel[] = isLocal
    ? ['error', 'warn', 'debug', 'verbose']
    : ['log', 'error', 'warn', 'debug', 'verbose'];
  const swaggerModules = isLocal
    ? [AppModule, AuthModule, KycModule, InternalModule, TransferModule]
    : [AppModule, AuthModule, KycModule, TransferModule];

  app.useLogger(logLevels);

  if (isLocal) {
    Logger.debug('Conectando a base de datos local');
    Logger.overrideLogger(logLevels);
  }

  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use('/photos', express.static(join(__dirname, '..', 'photos')));

  const swaggerApi = 'api/docs';
  const swaggerTheme = new SwaggerTheme();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Backend Prosper Project')
    .setVersion('0.1')
    .addBearerAuth()
    .setContact('Francisco Guevara', '', 'fjguevara6733@gmail.com')
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig, {
    include: swaggerModules,
  });

  SwaggerModule.setup(swaggerApi, app, swaggerDoc, {
    explorer: false,
    customCss: swaggerTheme.getBuffer(SwaggerThemeNameEnum.DARK),
  });

// --- Swagger API para backoffice ---
const backofficeSwaggerApi = 'api/backoffice-docs';
const backofficeSwaggerConfig = new DocumentBuilder()
  .setTitle('Backoffice API Docs')
  .setVersion('0.1')
  .addBearerAuth()
  .build();

const backofficeSwaggerDoc = SwaggerModule.createDocument(app, backofficeSwaggerConfig, {
  include: [BackOfficeModule],
});

SwaggerModule.setup(backofficeSwaggerApi, app, backofficeSwaggerDoc, {
  explorer: false,
  customCss: swaggerTheme.getBuffer(SwaggerThemeNameEnum.DARK),
});

app.enableCors();
  await app.listen(port);
  if (isLocal) {
    const yamlString = YAML.stringify(backofficeSwaggerDoc);
    writeFileSync('./swagger.yaml', yamlString);
    Logger.debug(
      '🚀🚀 Application is running on: ' +
        `http://localhost:${port}/${swaggerApi}`,
    );
    Logger.debug(
      '📘📘 Backoffice Swagger running on: ' +
        `http://localhost:${port}/${backofficeSwaggerApi}`,
    );
  } else {
    Logger.debug(`Application is running on::${port}`);
  }
}
bootstrap();
