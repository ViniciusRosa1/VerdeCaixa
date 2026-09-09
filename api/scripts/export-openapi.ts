import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://verde_caixa:verde_caixa@localhost:5432/verde_caixa';
process.env.AUTH_ACCESS_SECRET ??= 'openapi-generation-only-secret-32-characters';
process.env.AUTH_REFRESH_SECRET ??= 'openapi-generation-only-refresh-32-chars';

try {
  const { AppModule } = await import('../src/app.module.js');
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  app.setGlobalPrefix('api/v1');
  const config = new DocumentBuilder().setTitle('Verde Caixa API').setVersion('2.0').addCookieAuth('vc_access', { type: 'apiKey', in: 'cookie' }).addApiKey({ type: 'apiKey', in: 'header', name: 'x-csrf-token' }, 'csrf').build();
  const document = SwaggerModule.createDocument(app, config);
  await writeFile('openapi.json', JSON.stringify(document, null, 2));
  await app.close();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
