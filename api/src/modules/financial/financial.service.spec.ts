import { describe, expect, it } from 'vitest';
import { FinancialService } from './financial.service.js';

describe('FinancialService', () => {
  const service = new FinancialService({} as never, {} as never);

  it('distribui centavos sem alterar o total parcelado', () => {
    const installments = (service as any).installments(100, new Date('2026-09-08T00:00:00Z'), 3, true);
    expect(installments.map((item: any) => item.amount)).toEqual(['33.34', '33.33', '33.33']);
    expect(installments.reduce((sum: number, item: any) => sum + Number(item.amount), 0)).toBe(100);
  });

  it('gera vencimentos mensais preservando o fim do mês', () => {
    const installments = (service as any).installments(120, new Date('2026-01-31T00:00:00Z'), 3, true);
    expect(installments.map((item: any) => item.dueDate.toISOString().slice(0, 10))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
});
