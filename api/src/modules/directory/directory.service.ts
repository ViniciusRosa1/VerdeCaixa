import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { SequenceService } from "../../database/sequence.service.js";
import type { ListQueryDto } from "../../common/dto.js";
import { offset, paginated } from "../../common/dto.js";
import type {
  AccountDto,
  CategoryDto,
  CounterpartyDto,
  ProjectDto,
} from "./directory.dto.js";
import type { CounterpartyKind } from "../../generated/prisma/enums.js";

@Injectable()
export class DirectoryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SequenceService) private readonly sequences: SequenceService,
  ) {}

  async listCounterparties(
    companyId: string,
    kind: CounterpartyKind,
    query: ListQueryDto,
  ) {
    const where = {
      companyId,
      deactivatedAt: query.status === "inactive" ? { not: null } : null,
      kind: { in: [kind, "BOTH" as const] },
      ...(query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: "insensitive" as const },
              },
              { document: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.counterparty.findMany({
        where,
        skip: offset(query),
        take: query.limit,
        orderBy: { name: query.order },
      }),
      this.prisma.counterparty.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async createCounterparty(
    companyId: string,
    kind: CounterpartyKind,
    dto: CounterpartyDto,
  ) {
    return this.prisma.counterparty.create({
      data: {
        companyId,
        kind,
        publicCode: await this.sequences.next(companyId, kind),
        ...dto,
      },
    });
  }

  async updateCounterparty(
    companyId: string,
    id: string,
    dto: Partial<CounterpartyDto>,
  ) {
    await this.ensure("counterparty", companyId, id);
    return this.prisma.counterparty.update({ where: { id }, data: dto });
  }

  async deactivateCounterparty(companyId: string, id: string) {
    await this.ensure("counterparty", companyId, id);
    return this.prisma.counterparty.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
  }

  async listCategories(companyId: string, query: ListQueryDto) {
    const where = {
      companyId,
      deactivatedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: { children: { where: { deactivatedAt: null } } },
        skip: offset(query),
        take: query.limit,
        orderBy: { name: query.order },
      }),
      this.prisma.category.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  createCategory(companyId: string, dto: CategoryDto) {
    return this.sequences
      .next(companyId, "CATEGORY")
      .then((publicCode) =>
        this.prisma.category.create({
          data: { companyId, publicCode, ...dto },
        }),
      );
  }

  async updateCategory(
    companyId: string,
    id: string,
    dto: Partial<CategoryDto>,
  ) {
    await this.ensure("category", companyId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }
  async deactivateCategory(companyId: string, id: string) {
    await this.ensure("category", companyId, id);
    return this.prisma.category.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
  }

  async listAccounts(companyId: string, query: ListQueryDto) {
    const where = {
      companyId,
      deactivatedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where,
        include: {
          settlements: {
            include: { installment: { include: { entry: true } } },
          },
        },
        skip: offset(query),
        take: query.limit,
        orderBy: { name: query.order },
      }),
      this.prisma.financialAccount.count({ where }),
    ]);
    const data = rows.map(({ settlements, ...account }) => ({
      ...account,
      openingBalance: account.openingBalance.toString(),
      balance: settlements
        .reduce(
          (sum, item) =>
            sum +
            Number(item.amount) *
              (item.installment.entry.kind === "INCOME" ? 1 : -1),
          Number(account.openingBalance),
        )
        .toFixed(2),
    }));
    return paginated(data, total, query);
  }

  createAccount(companyId: string, dto: AccountDto) {
    return this.sequences
      .next(companyId, "ACCOUNT")
      .then((publicCode) =>
        this.prisma.financialAccount.create({
          data: { companyId, publicCode, ...dto },
        }),
      );
  }
  async updateAccount(companyId: string, id: string, dto: Partial<AccountDto>) {
    await this.ensure("financialAccount", companyId, id);
    return this.prisma.financialAccount.update({ where: { id }, data: dto });
  }
  async deactivateAccount(companyId: string, id: string) {
    await this.ensure("financialAccount", companyId, id);
    return this.prisma.financialAccount.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
  }

  async listProjects(companyId: string, query: ListQueryDto) {
    const where = {
      companyId,
      deactivatedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          client: true,
          entries: {
            include: { installments: { include: { settlement: true } } },
          },
        },
        skip: offset(query),
        take: query.limit,
        orderBy: { name: query.order },
      }),
      this.prisma.project.count({ where }),
    ]);
    const data = rows.map(({ entries, ...project }) => ({
      ...project,
      result: entries
        .flatMap((entry) =>
          entry.installments.map((installment) =>
            installment.settlement
              ? Number(installment.settlement.amount) *
                (entry.kind === "INCOME" ? 1 : -1)
              : 0,
          ),
        )
        .reduce((a, b) => a + b, 0)
        .toFixed(2),
    }));
    return paginated(data, total, query);
  }

  createProject(companyId: string, dto: ProjectDto) {
    return this.sequences
      .next(companyId, "PROJECT")
      .then((publicCode) =>
        this.prisma.project.create({
          data: {
            companyId,
            publicCode,
            ...dto,
            startsOn: new Date(dto.startsOn),
            endsOn: dto.endsOn ? new Date(dto.endsOn) : undefined,
          },
        }),
      );
  }
  async updateProject(companyId: string, id: string, dto: Partial<ProjectDto>) {
    await this.ensure("project", companyId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startsOn: dto.startsOn ? new Date(dto.startsOn) : undefined,
        endsOn: dto.endsOn ? new Date(dto.endsOn) : undefined,
      },
    });
  }
  async deactivateProject(companyId: string, id: string) {
    await this.ensure("project", companyId, id);
    return this.prisma.project.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
  }

  private async ensure(
    model: "counterparty" | "category" | "financialAccount" | "project",
    companyId: string,
    id: string,
  ) {
    const row = await (
      this.prisma[model] as unknown as {
        findFirst(args: unknown): Promise<unknown>;
      }
    ).findFirst({ where: { id, companyId } });
    if (!row) throw new NotFoundException("Registro não encontrado");
    return row;
  }
}
