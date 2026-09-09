import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

const prefixes: Record<string, string> = {
  INCOME: 'REC', EXPENSE: 'PAG', CLIENT: 'CLI', SUPPLIER: 'FOR', CATEGORY: 'CAT',
  ACCOUNT: 'CON', PROJECT: 'PRJ', USER: 'USR', ROLE: 'ROL',
};

@Injectable()
export class SequenceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async next(companyId: string, entity: string) {
    const counter = await this.prisma.sequenceCounter.upsert({
      where: { companyId_entity: { companyId, entity } },
      create: { companyId, entity, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `${prefixes[entity] ?? entity.slice(0, 3).toUpperCase()}-${String(counter.value).padStart(entity === 'INCOME' || entity === 'EXPENSE' ? 4 : 3, '0')}`;
  }
}
