import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../database/prisma.service.js";
import { SequenceService } from "../../database/sequence.service.js";
import { offset, paginated } from "../../common/dto.js";
import type { AuthUser } from "../../common/current-user.decorator.js";
import type {
  CreateFinancialEntryDto,
  FinancialListQueryDto,
  SettleDto,
  UpdateFinancialEntryDto,
} from "./financial.dto.js";

const addMonths = (date: Date, months: number) => {
  const result = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
    ),
  );
  if (result.getUTCDate() !== date.getUTCDate()) result.setUTCDate(0);
  return result;
};

const dateOnly = (value: string | Date) =>
  new Date(
    `${typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10)}T00:00:00.000Z`,
  );

@Injectable()
export class FinancialService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SequenceService) private readonly sequences: SequenceService,
  ) {}

  async list(companyId: string, query: FinancialListQueryDto) {
    const dueDate =
      query.from || query.to
        ? {
            gte: query.from ? dateOnly(query.from) : undefined,
            lte: query.to ? dateOnly(query.to) : undefined,
          }
        : undefined;
    const today = dateOnly(new Date());
    const statusFilter =
      query.status === "OVERDUE"
        ? {
            installments: {
              some: {
                status: "PENDING" as const,
                dueDate: { ...(dueDate ?? {}), lt: today },
              },
            },
          }
        : query.status === "SETTLED"
          ? { installments: { every: { status: "SETTLED" as const } } }
          : query.status === "PENDING"
            ? {
                AND: [
                  {
                    installments: {
                      some: {
                        status: "PENDING" as const,
                        dueDate: { ...(dueDate ?? {}), gte: today },
                      },
                    },
                  },
                  {
                    installments: {
                      none: {
                        status: "PENDING" as const,
                        dueDate: { lt: today },
                      },
                    },
                  },
                ],
              }
            : dueDate
              ? { installments: { some: { dueDate } } }
              : {};
    const where = {
      companyId,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.search
        ? {
            OR: [
              {
                description: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
              {
                publicCode: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
              {
                counterparty: {
                  name: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
      ...statusFilter,
      ...(query.status === "CANCELED"
        ? { canceledAt: { not: null } }
        : { canceledAt: null }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.financialEntry.findMany({
        where,
        include: {
          counterparty: true,
          category: true,
          project: true,
          installments: {
            orderBy: { sequence: "asc" },
            include: { settlement: true },
          },
        },
        skip: offset(query),
        take: query.limit,
        orderBy: { createdAt: query.order },
      }),
      this.prisma.financialEntry.count({ where }),
    ]);
    return paginated(
      rows.map((row) => this.present(row)),
      total,
      query,
    );
  }

  async get(companyId: string, id: string) {
    const row = await this.prisma.financialEntry.findFirst({
      where: { companyId, OR: [{ id }, { publicCode: id }] },
      include: {
        counterparty: true,
        category: true,
        project: true,
        installments: {
          orderBy: { sequence: "asc" },
          include: { settlement: true },
        },
        recurrence: true,
      },
    });
    if (!row) throw new NotFoundException("Lançamento não encontrado");
    return this.present(row);
  }

  async create(user: AuthUser, dto: CreateFinancialEntryDto) {
    await this.validateRelations(user.companyId, dto);
    const publicCode = await this.sequences.next(user.companyId, dto.kind);
    const firstDueDate = dateOnly(dto.dueDate);
    const count =
      dto.plan === "INSTALLMENT"
        ? (dto.installmentCount ?? 2)
        : dto.plan === "RECURRING"
          ? 12
          : 1;
    const recurringEnd = dto.recurrenceEndsOn
      ? dateOnly(dto.recurrenceEndsOn)
      : undefined;
    const effectiveCount =
      dto.plan === "RECURRING" && recurringEnd
        ? Math.max(
            1,
            Math.min(
              120,
              (recurringEnd.getUTCFullYear() - firstDueDate.getUTCFullYear()) *
                12 +
                recurringEnd.getUTCMonth() -
                firstDueDate.getUTCMonth() +
                1,
            ),
          )
        : count;
    const installments = this.installments(
      dto.totalAmount,
      firstDueDate,
      effectiveCount,
      dto.plan === "INSTALLMENT",
    );
    const row = await this.prisma.financialEntry.create({
      data: {
        companyId: user.companyId,
        createdById: user.id,
        publicCode,
        kind: dto.kind,
        plan: dto.plan,
        description: dto.description,
        counterpartyId: dto.counterpartyId,
        categoryId: dto.categoryId,
        projectId: dto.projectId,
        totalAmount: dto.totalAmount,
        notes: dto.notes,
        installments: { create: installments },
        recurrence:
          dto.plan === "RECURRING"
            ? {
                create: {
                  startsOn: firstDueDate,
                  endsOn: recurringEnd,
                  generatedUntil: installments.at(-1)!.dueDate,
                },
              }
            : undefined,
      },
      include: {
        counterparty: true,
        category: true,
        project: true,
        installments: {
          orderBy: { sequence: "asc" },
          include: { settlement: true },
        },
        recurrence: true,
      },
    });
    await this.audit(
      user,
      "CREATE",
      row.id,
      `criou o lançamento ${row.publicCode}`,
    );
    return this.present(row);
  }

  async update(user: AuthUser, id: string, dto: UpdateFinancialEntryDto) {
    const existing = await this.prisma.financialEntry.findFirst({
      where: { id, companyId: user.companyId, canceledAt: null },
    });
    if (!existing) throw new NotFoundException("Lançamento não encontrado");
    const row = await this.prisma.financialEntry.update({
      where: { id },
      data: dto,
      include: {
        counterparty: true,
        category: true,
        project: true,
        installments: {
          orderBy: { sequence: "asc" },
          include: { settlement: true },
        },
      },
    });
    await this.audit(
      user,
      "UPDATE",
      id,
      `editou o lançamento ${row.publicCode}`,
    );
    return this.present(row);
  }

  async cancel(user: AuthUser, id: string) {
    const existing = await this.prisma.financialEntry.findFirst({
      where: { id, companyId: user.companyId, canceledAt: null },
      include: { installments: true },
    });
    if (!existing) throw new NotFoundException("Lançamento não encontrado");
    if (existing.installments.some((item) => item.status === "SETTLED"))
      throw new BadRequestException(
        "Não é possível cancelar um lançamento com parcelas liquidadas",
      );
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.financialEntry.update({
        where: { id },
        data: { canceledAt: now },
      }),
      this.prisma.financialInstallment.updateMany({
        where: { entryId: id, status: "PENDING" },
        data: { status: "CANCELED", canceledAt: now },
      }),
    ]);
    await this.audit(
      user,
      "CANCEL",
      id,
      `cancelou o lançamento ${existing.publicCode}`,
    );
    return { message: "Lançamento cancelado." };
  }

  async settle(user: AuthUser, installmentId: string, dto: SettleDto) {
    const installment = await this.prisma.financialInstallment.findFirst({
      where: {
        id: installmentId,
        entry: { companyId: user.companyId, canceledAt: null },
      },
      include: { entry: true },
    });
    if (!installment) throw new NotFoundException("Parcela não encontrada");
    if (installment.status !== "PENDING")
      throw new BadRequestException("A parcela não está pendente");
    const account = await this.prisma.financialAccount.findFirst({
      where: {
        id: dto.accountId,
        companyId: user.companyId,
        deactivatedAt: null,
      },
    });
    if (!account) throw new BadRequestException("Conta financeira inválida");
    const settlement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          installmentId,
          accountId: dto.accountId,
          settledById: user.id,
          amount: installment.amount,
          settledAt: dto.settledAt ? new Date(dto.settledAt) : new Date(),
          notes: dto.notes,
        },
      });
      await tx.financialInstallment.update({
        where: { id: installmentId },
        data: { status: "SETTLED" },
      });
      await tx.notification.create({
        data: {
          companyId: user.companyId,
          userId: user.id,
          type: "SETTLEMENT",
          title: "Liquidação confirmada",
          message: `${installment.entry.publicCode} foi liquidado com sucesso.`,
          link: installment.entry.kind === "INCOME" ? "/receber" : "/pagar",
        },
      });
      return created;
    });
    await this.audit(
      user,
      "SETTLE",
      installment.entryId,
      `liquidou ${installment.entry.publicCode}`,
    );
    return { ...settlement, amount: settlement.amount.toString() };
  }

  async reverseSettlement(user: AuthUser, installmentId: string) {
    const installment = await this.prisma.financialInstallment.findFirst({
      where: {
        id: installmentId,
        entry: { companyId: user.companyId, canceledAt: null },
      },
      include: { entry: true, settlement: true },
    });
    if (!installment) throw new NotFoundException("Parcela não encontrada");
    if (!installment.settlement || installment.status !== "SETTLED") {
      throw new BadRequestException("A parcela não possui uma liquidação");
    }

    await this.prisma.$transaction([
      this.prisma.settlement.delete({
        where: { id: installment.settlement.id },
      }),
      this.prisma.financialInstallment.update({
        where: { id: installmentId },
        data: { status: "PENDING" },
      }),
    ]);
    await this.audit(
      user,
      "UNSETTLE",
      installment.entryId,
      `excluiu a liquidação de ${installment.entry.publicCode}`,
    );
    return { message: "Liquidação excluída." };
  }

  @Cron("0 3 1 * *")
  async extendRecurrences() {
    const rules = await this.prisma.recurrenceRule.findMany({
      where: { entry: { canceledAt: null } },
      include: { entry: true },
    });
    for (const rule of rules) {
      const target = addMonths(new Date(), 12);
      const limit = rule.endsOn && rule.endsOn < target ? rule.endsOn : target;
      let due = addMonths(rule.generatedUntil, rule.intervalMonths);
      let sequence =
        (await this.prisma.financialInstallment.count({
          where: { entryId: rule.entryId },
        })) + 1;
      while (due <= limit) {
        await this.prisma.financialInstallment.upsert({
          where: { entryId_dueDate: { entryId: rule.entryId, dueDate: due } },
          create: {
            entryId: rule.entryId,
            sequence,
            dueDate: due,
            amount: rule.entry.totalAmount,
          },
          update: {},
        });
        sequence += 1;
        due = addMonths(due, rule.intervalMonths);
      }
      const generatedUntil = addMonths(due, -rule.intervalMonths);
      if (generatedUntil > rule.generatedUntil)
        await this.prisma.recurrenceRule.update({
          where: { id: rule.id },
          data: { generatedUntil },
        });
    }
  }

  private installments(
    total: number,
    first: Date,
    count: number,
    split: boolean,
  ) {
    const totalCents = Math.round(total * 100);
    const base = split ? Math.floor(totalCents / count) : totalCents;
    const remainder = split ? totalCents - base * count : 0;
    return Array.from({ length: count }, (_, index) => ({
      sequence: index + 1,
      dueDate: addMonths(first, index),
      amount: ((base + (index < remainder ? 1 : 0)) / 100).toFixed(2),
    }));
  }

  private present(row: any) {
    const pending = row.installments.filter(
      (item: any) => item.status === "PENDING",
    );
    const overdue = pending.some(
      (item: any) => item.dueDate < dateOnly(new Date()),
    );
    const status = row.canceledAt
      ? "CANCELED"
      : pending.length === 0
        ? "SETTLED"
        : overdue
          ? "OVERDUE"
          : "PENDING";
    return {
      ...row,
      totalAmount: row.totalAmount.toString(),
      status,
      dueDate: pending[0]?.dueDate ?? row.installments[0]?.dueDate,
      installments: row.installments.map((item: any) => ({
        ...item,
        amount: item.amount.toString(),
        settlement: item.settlement
          ? { ...item.settlement, amount: item.settlement.amount.toString() }
          : null,
      })),
    };
  }

  private async validateRelations(
    companyId: string,
    dto: CreateFinancialEntryDto,
  ) {
    const [counterparty, category, project] = await Promise.all([
      this.prisma.counterparty.findFirst({
        where: { id: dto.counterpartyId, companyId, deactivatedAt: null },
      }),
      this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId, deactivatedAt: null },
      }),
      dto.projectId
        ? this.prisma.project.findFirst({
            where: { id: dto.projectId, companyId, deactivatedAt: null },
          })
        : Promise.resolve(true),
    ]);
    if (!counterparty || !category || !project)
      throw new BadRequestException("Há um cadastro inválido no lançamento");
    if (
      (dto.kind === "INCOME" && category.kind !== "INCOME") ||
      (dto.kind === "EXPENSE" && category.kind !== "EXPENSE")
    )
      throw new BadRequestException(
        "A categoria não corresponde ao tipo do lançamento",
      );
  }

  private audit(
    user: AuthUser,
    action: string,
    entityId: string,
    summary: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        actorId: user.id,
        action,
        entityType: "FinancialEntry",
        entityId,
        summary,
      },
    });
  }
}
