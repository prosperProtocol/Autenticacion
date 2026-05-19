import {
  ClassSerializerInterceptor,
  Logger,
  LogLevel,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

import { AppModule } from 'src/app.module';
import { LogInterceptor } from 'src/common/interceptors/LogInterceptor.interceptor';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ProsperModule } from 'src/modules/prosper/prosper.module';
import { AlfredModule } from './modules/alfred/alfred.module';

async function bootstrap() {
  const logLevels: LogLevel[] = process.env.DEBBUGER
    ? ['error', 'warn', 'debug', 'verbose']
    : ['log', 'error', 'warn', 'debug', 'verbose'];

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: logLevels,
  });

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use('/photos', express.static(join(__dirname, '..', 'photos')));
  app.enableCors();
  app.setGlobalPrefix('api/v1', {
    exclude: ['public/:hash'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new LogInterceptor());

  if (process.env.DEBBUGER) {
    Logger.debug('Conectando a base de datos local');
    Logger.overrideLogger(logLevels);
  }

  // Swagger principal: solo ProsperModule
  const externalOptions = new DocumentBuilder()
    .setTitle('APIs Prosper - Stellar Protocol')
    .setDescription('APIs Prosper - Stellar Protocol documentation')
    .setVersion('2.0')
    .addBearerAuth()
    .build();

  const externalDoc = SwaggerModule.createDocument(app, externalOptions, {
    include: [AuthModule, AlfredModule, ProsperModule],
  });
  const yamlDataInt = yaml.dump(externalDoc);
  fs.writeFileSync('./documentacion.yaml', yamlDataInt);

  const swaggerApi = 'api/docs';
  const theme = new SwaggerTheme();
  const options = {
    explorer: false,
    customCss: theme.getBuffer(SwaggerThemeNameEnum.DARK),
  };

  SwaggerModule.setup(swaggerApi, app, externalDoc, options);

  // Swagger interno: todos los módulos
  const internalOptions = new DocumentBuilder()
    .setTitle('APIs Prosper - Stellar Protocol Internal')
    .setDescription('APIs Prosper - Stellar Protocol internal documentation')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const internalDoc = SwaggerModule.createDocument(app, internalOptions);
  const swaggerApiInt = 'api/docs/internal';
  SwaggerModule.setup(swaggerApiInt, app, internalDoc, options);

  if (process.env.DEBBUGER) {
    // YAML para compatibilidad
    const yamlDataInt = yaml.dump(internalDoc);
    fs.writeFileSync('./prosper_stellar_protocol.yaml', yamlDataInt);
    Logger.debug(
      '✅ Archivo prosper_stellar_protocol.yaml ' +
        'generado correctamente en la raíz del proyecto',
    );
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('server.port') || 3000;

  await app.listen(port);

  if (process.env.DEBBUGER) {
    Logger.debug(
      '🚀🚀 Application is running on: ' +
        `http://localhost:${port}/${swaggerApi}`,
    );
    Logger.debug(
      '📘📘 Internal Swagger running on: ' +
        `http://localhost:${port}/${swaggerApiInt}`,
    );
  } else {
    Logger.debug(`Application is running on::${port}`);
  }
}

bootstrap();
