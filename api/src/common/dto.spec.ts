import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ListQueryDto, offset, paginated } from './dto.js';
import { FinancialListQueryDto } from '../modules/financial/financial.dto.js';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

describe('Paginação das listagens', () => {
  it.each([ListQueryDto, FinancialListQueryDto])('converte parâmetros da URL em números (%s)', async (metatype) => {
    const query = await pipe.transform({ page: '2', limit: '100' }, { type: 'query', metatype });
    expect(query.page).toBe(2);
    expect(query.limit).toBe(100);
    expect(offset(query)).toBe(100);
    expect(paginated([], 250, query).meta).toEqual({ page: 2, limit: 100, total: 250, pages: 3 });
  });

  it('mantém os valores padrão quando a URL omite a paginação', async () => {
    const query = await pipe.transform({}, { type: 'query', metatype: ListQueryDto });
    expect(query).toMatchObject({ page: 1, limit: 20 });
  });

  it.each(['0', '101', '-1', '1.5', 'abc', ''])('rejeita limit inválido: %s', async (limit) => {
    await expect(pipe.transform({ limit }, { type: 'query', metatype: ListQueryDto })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['0', '-1', '1.5', 'abc'])('rejeita page inválido: %s', async (page) => {
    await expect(pipe.transform({ page }, { type: 'query', metatype: ListQueryDto })).rejects.toBeInstanceOf(BadRequestException);
  });
});
