import { Inject, Injectable } from '@nestjs/common';
import { offset, paginated, type ListQueryDto } from '../../common/dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ActivityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async notifications(companyId: string, userId: string, query: ListQueryDto) {
    const where = { companyId, OR: [{ userId }, { userId: null }], ...(query.status === 'unread' ? { readAt: null } : {}) };
    const [data, total] = await Promise.all([this.prisma.notification.findMany({ where, skip: offset(query), take: query.limit, orderBy: { createdAt: 'desc' } }), this.prisma.notification.count({ where })]);
    return paginated(data, total, query);
  }

  async read(companyId: string, userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, companyId, OR: [{ userId }, { userId: null }] }, data: { readAt: new Date() } });
    return { message: 'Notificação marcada como lida.' };
  }

  async readAll(companyId: string, userId: string) {
    await this.prisma.notification.updateMany({ where: { companyId, OR: [{ userId }, { userId: null }], readAt: null }, data: { readAt: new Date() } });
    return { message: 'Notificações marcadas como lidas.' };
  }

  async audit(companyId: string, query: ListQueryDto) {
    const where = { companyId, ...(query.search ? { OR: [{ summary: { contains: query.search, mode: 'insensitive' as const } }, { actor: { name: { contains: query.search, mode: 'insensitive' as const } } }] } : {}) };
    const [data, total] = await Promise.all([this.prisma.auditLog.findMany({ where, include: { actor: { select: { id: true, name: true, email: true } } }, skip: offset(query), take: query.limit, orderBy: { createdAt: 'desc' } }), this.prisma.auditLog.count({ where })]);
    return paginated(data, total, query);
  }

  @Cron('0 8 * * *')
  async createDueDateNotifications() {
    const companies = await this.prisma.company.findMany({ where: { reminderEnabled: true } });
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    for (const company of companies) {
      const limit = new Date(start.getTime() + company.reminderDaysBefore * 86_400_000);
      const installments = await this.prisma.financialInstallment.findMany({ where: { status: 'PENDING', dueDate: { lte: limit }, entry: { companyId: company.id, canceledAt: null } }, include: { entry: true } });
      for (const installment of installments) {
        const title = installment.dueDate < start ? 'Lançamento vencido' : 'Vencimento próximo';
        const message = `${installment.entry.publicCode} · ${installment.entry.description}`;
        const exists = await this.prisma.notification.findFirst({ where: { companyId: company.id, type: 'DUE_DATE', message, createdAt: { gte: start } } });
        if (!exists) await this.prisma.notification.create({ data: { companyId: company.id, type: 'DUE_DATE', title, message, link: installment.entry.kind === 'INCOME' ? '/receber' : '/pagar' } });
      }
    }
  }
}
