import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: process.env.APP_ORIGIN?.split(',') ?? true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Verde Caixa API')
    .setDescription('Contrato da segunda versão do Verde Caixa')
    .setVersion('2.0')
    .addCookieAuth('vc_access', { type: 'apiKey', in: 'cookie' })
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-csrf-token' }, 'csrf')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: '/api/docs-json' });
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
