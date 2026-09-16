import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PrismaService } from "../../database/prisma.service.js";
import type {
  DashboardQueryDto,
  PeriodQueryDto,
} from "./insights.dto.js";

const startOfMonth = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};
const endOfMonth = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59),
  );
};
const range = (query: PeriodQueryDto) => ({
  gte: query.from ? new Date(`${query.from}T00:00:00Z`) : startOfMonth(),
  lte: query.to ? new Date(`${query.to}T23:59:59Z`) : endOfMonth(),
});
const money = (value: number) => value.toFixed(2);

@Injectable()
export class InsightsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async dashboard(companyId: string, query: DashboardQueryDto = {}) {
    await this.ensureAccount(companyId, query.accountId);
    const [accounts, installments, recent] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where: {
          companyId,
          deactivatedAt: null,
          ...(query.accountId ? { id: query.accountId } : {}),
        },
        include: {
          settlements: {
            include: { installment: { include: { entry: true } } },
          },
        },
      }),
      this.prisma.financialInstallment.findMany({
        where: {
          entry: {
            companyId,
            canceledAt: null,
            ...(query.accountId ? { accountId: query.accountId } : {}),
          },
        },
        include: { entry: true },
      }),
      this.prisma.financialInstallment.findMany({
        where: {
          entry: { companyId, canceledAt: null },
          ...(query.accountId
            ? {
                OR: [
                  { entry: { accountId: query.accountId } },
                  { settlement: { accountId: query.accountId } },
                ],
              }
            : {}),
        },
        include: {
          entry: { include: { counterparty: true } },
          settlement: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
    ]);
    const balance = accounts.reduce(
      (sum, account) =>
        sum +
        Number(account.openingBalance) +
        account.settlements.reduce(
          (subtotal, settlement) =>
            subtotal +
            Number(settlement.amount) *
              (settlement.installment.entry.kind === "INCOME" ? 1 : -1),
          0,
        ),
      0,
    );
    const pendingIncome = installments
      .filter(
        (item) => item.entry.kind === "INCOME" && item.status === "PENDING",
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const pendingExpense = installments
      .filter(
        (item) => item.entry.kind === "EXPENSE" && item.status === "PENDING",
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const overdue = installments.filter(
      (item) => item.status === "PENDING" && item.dueDate < new Date(),
    );
    return {
      balance: money(balance),
      receivable: money(pendingIncome),
      payable: money(pendingExpense),
      projected: money(balance + pendingIncome - pendingExpense),
      overdueCount: overdue.length,
      overdueAmount: money(
        overdue.reduce((sum, item) => sum + Number(item.amount), 0),
      ),
      recent: recent.map((item) => this.presentInstallment(item)),
    };
  }

  async agenda(companyId: string, query: PeriodQueryDto) {
    await this.ensureAccount(companyId, query.accountId);
    const dueDate =
      query.from || query.to
        ? range(query)
        : { lte: new Date(Date.now() + 7 * 86_400_000) };
    const rows = await this.prisma.financialInstallment.findMany({
      where: {
        status: "PENDING",
        dueDate,
        entry: {
          companyId,
          canceledAt: null,
          ...(query.accountId ? { accountId: query.accountId } : {}),
        },
      },
      include: { entry: { include: { counterparty: true, category: true } } },
      orderBy: { dueDate: "asc" },
    });
    const today = new Date().toISOString().slice(0, 10);
    return {
      overdue: rows
        .filter((item) => item.dueDate.toISOString().slice(0, 10) < today)
        .map((item) => this.presentInstallment(item)),
      today: rows
        .filter((item) => item.dueDate.toISOString().slice(0, 10) === today)
        .map((item) => this.presentInstallment(item)),
      upcoming: rows
        .filter((item) => item.dueDate.toISOString().slice(0, 10) > today)
        .map((item) => this.presentInstallment(item)),
    };
  }

  async report(companyId: string, kind: string, query: PeriodQueryDto) {
    await this.ensureAccount(companyId, query.accountId);
    const settlements = await this.prisma.settlement.findMany({
      where: {
        settledAt: range(query),
        ...(query.accountId ? { accountId: query.accountId } : {}),
        installment: { entry: { companyId, canceledAt: null } },
      },
      include: {
        installment: {
          include: { entry: { include: { category: true, project: true } } },
        },
        account: true,
      },
    });
    const income = settlements
      .filter((item) => item.installment.entry.kind === "INCOME")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const expense = settlements
      .filter((item) => item.installment.entry.kind === "EXPENSE")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    if (kind === "dre") {
      const categories = new Map<string, number>();
      for (const item of settlements)
        categories.set(
          item.installment.entry.category.name,
          (categories.get(item.installment.entry.category.name) ?? 0) +
            Number(item.amount) *
              (item.installment.entry.kind === "INCOME" ? 1 : -1),
        );
      return {
        kind,
        from: range(query).gte,
        to: range(query).lte,
        income: money(income),
        expense: money(expense),
        result: money(income - expense),
        lines: [...categories].map(([label, value]) => ({
          label,
          value: money(value),
        })),
      };
    }
    const accounts = await this.prisma.financialAccount.findMany({
      where: {
        companyId,
        deactivatedAt: null,
        ...(query.accountId ? { id: query.accountId } : {}),
      },
      include: {
        settlements: { include: { installment: { include: { entry: true } } } },
      },
    });
    const balance = accounts.reduce(
      (sum, account) =>
        sum +
        Number(account.openingBalance) +
        account.settlements.reduce(
          (subtotal, item) =>
            subtotal +
            Number(item.amount) *
              (item.installment.entry.kind === "INCOME" ? 1 : -1),
          0,
        ),
      0,
    );
    if (kind === "dfc")
      return {
        kind,
        from: range(query).gte,
        to: range(query).lte,
        income: money(income),
        expense: money(expense),
        netChange: money(income - expense),
        finalBalance: money(balance),
      };
    const pending = await this.prisma.financialInstallment.findMany({
      where: {
        status: "PENDING",
        entry: {
          companyId,
          canceledAt: null,
          ...(query.accountId ? { accountId: query.accountId } : {}),
        },
      },
      include: { entry: true },
    });
    const receivable = pending
      .filter((item) => item.entry.kind === "INCOME")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const payable = pending
      .filter((item) => item.entry.kind === "EXPENSE")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    if (kind === "posicao-financeira")
      return {
        kind,
        balance: money(balance),
        receivable: money(receivable),
        payable: money(payable),
        netPosition: money(balance + receivable - payable),
      };
    return {
      kind: "kpis",
      balance: money(balance),
      receivable: money(receivable),
      payable: money(payable),
      monthlyResult: money(income - expense),
      margin: income
        ? Number((((income - expense) / income) * 100).toFixed(1))
        : 0,
      cashFlow: await this.cashFlow(companyId, query),
    };
  }

  async export(
    companyId: string,
    kind: string,
    query: PeriodQueryDto,
    format: "pdf" | "csv",
  ) {
    const report = await this.report(companyId, kind, query);
    if (format === "csv") {
      const lines = Object.entries(report)
        .filter(([, value]) => typeof value !== "object")
        .map(
          ([key, value]) => `"${key}";"${String(value).replaceAll('"', '""')}"`,
        );
      if ("lines" in report && Array.isArray(report.lines))
        for (const line of report.lines as Array<{
          label: string;
          value: string;
        }>)
          lines.push(`"${line.label.replaceAll('"', '""')}";"${line.value}"`);
      return {
        contentType: "text/csv; charset=utf-8",
        extension: "csv",
        data: Buffer.from(`\uFEFFCampo;Valor\n${lines.join("\n")}`),
      };
    }
    const data = await new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 48, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.fontSize(20).fillColor("#1F2A1E").text("Verde Caixa");
      doc.moveDown().fontSize(15).text(`Relatório: ${kind.toUpperCase()}`);
      doc.moveDown().fontSize(10).fillColor("#4F5E4D");
      for (const [key, value] of Object.entries(report))
        if (typeof value !== "object") doc.text(`${key}: ${String(value)}`);
      if ("lines" in report && Array.isArray(report.lines)) {
        doc.moveDown();
        for (const line of report.lines as Array<{
          label: string;
          value: string;
        }>)
          doc.text(`${line.label}: ${line.value}`);
      }
      doc.end();
    });
    return { contentType: "application/pdf", extension: "pdf", data };
  }

  private async cashFlow(companyId: string, query: PeriodQueryDto = {}) {
    const now = new Date();
    const filtered = Boolean(query.from && query.to);
    const from = filtered
      ? new Date(`${query.from}T00:00:00Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const to = filtered
      ? new Date(`${query.to}T23:59:59Z`)
      : new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1,
            0,
            23,
            59,
            59,
          ),
        );
    const daily =
      from.getUTCFullYear() === to.getUTCFullYear() &&
      from.getUTCMonth() === to.getUTCMonth();
    const settlements = await this.prisma.settlement.findMany({
      where: {
        settledAt: { gte: from, lte: to },
        ...(query.accountId ? { accountId: query.accountId } : {}),
        installment: { entry: { companyId, canceledAt: null } },
      },
      include: { installment: { include: { entry: true } } },
    });
    const result: Array<{ month: string; income: string; expense: string }> = [];
    let cursor = daily
      ? new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
      : new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const last = daily
      ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
      : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    while (cursor <= last) {
      const bucketStart = new Date(cursor);
      const bucketEnd = daily
        ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), 23, 59, 59))
        : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59));
      const rows = settlements.filter(
        (item) => item.settledAt >= bucketStart && item.settledAt <= bucketEnd,
      );
      result.push({
        month: daily
          ? String(cursor.getUTCDate()).padStart(2, "0")
          : cursor
              .toLocaleString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
              .replace(".", ""),
        income: money(rows.filter((item) => item.installment.entry.kind === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0)),
        expense: money(rows.filter((item) => item.installment.entry.kind === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0)),
      });
      cursor = daily
        ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1))
        : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return result;
  }

  private presentInstallment(item: any) {
    return {
      id: item.id,
      publicCode: item.entry.publicCode,
      entryId: item.entry.id,
      kind: item.entry.kind,
      description: item.entry.description,
      counterparty: item.entry.counterparty?.name,
      category: item.entry.category?.name,
      dueDate: item.dueDate,
      amount: item.amount.toString(),
      status: item.status,
      settledAt: item.settlement?.settledAt,
    };
  }

  private async ensureAccount(companyId: string, accountId?: string) {
    if (!accountId) return;
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, companyId, deactivatedAt: null },
      select: { id: true },
    });
    if (!account) throw new BadRequestException("Conta financeira inválida");
  }
}
