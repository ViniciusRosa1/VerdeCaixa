import { describe, expect, it, vi } from "vitest";
import { FinancialService } from "./financial.service.js";

describe("FinancialService", () => {
  const service = new FinancialService({} as never, {} as never);

  it("distribui centavos sem alterar o total parcelado", () => {
    const installments = (service as any).installments(
      100,
      new Date("2026-09-08T00:00:00Z"),
      3,
      true,
    );
    expect(installments.map((item: any) => item.amount)).toEqual([
      "33.34",
      "33.33",
      "33.33",
    ]);
    expect(
      installments.reduce(
        (sum: number, item: any) => sum + Number(item.amount),
        0,
      ),
    ).toBe(100);
  });

  it("gera vencimentos mensais preservando o fim do mês", () => {
    const installments = (service as any).installments(
      120,
      new Date("2026-01-31T00:00:00Z"),
      3,
      true,
    );
    expect(
      installments.map((item: any) => item.dueDate.toISOString().slice(0, 10)),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("exclui a liquidação e devolve a parcela para pendente", async () => {
    const settlementDelete = vi.fn().mockResolvedValue({});
    const installmentUpdate = vi.fn().mockResolvedValue({});
    const transaction = vi.fn().mockResolvedValue([]);
    const auditCreate = vi.fn().mockResolvedValue({});
    const prisma = {
      financialInstallment: {
        findFirst: vi.fn().mockResolvedValue({
          id: "installment-id",
          entryId: "entry-id",
          status: "SETTLED",
          settlement: { id: "settlement-id" },
          entry: { publicCode: "PAG-0001" },
        }),
        update: installmentUpdate,
      },
      settlement: { delete: settlementDelete },
      auditLog: { create: auditCreate },
      $transaction: transaction,
    };
    const reverseService = new FinancialService(prisma as never, {} as never);

    await expect(
      reverseService.reverseSettlement(
        { id: "user-id", companyId: "company-id" } as never,
        "installment-id",
      ),
    ).resolves.toEqual({ message: "Liquidação excluída." });
    expect(settlementDelete).toHaveBeenCalledWith({
      where: { id: "settlement-id" },
    });
    expect(installmentUpdate).toHaveBeenCalledWith({
      where: { id: "installment-id" },
      data: { status: "PENDING" },
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(auditCreate).toHaveBeenCalledOnce();
  });

  it("impede excluir um lançamento depois de liquidado", async () => {
    const update = vi.fn();
    const prisma = {
      financialEntry: {
        findFirst: vi.fn().mockResolvedValue({
          id: "entry-id",
          publicCode: "REC-0001",
          installments: [{ status: "SETTLED" }],
        }),
        update,
      },
    };
    const cancelService = new FinancialService(prisma as never, {} as never);
    await expect(
      cancelService.cancel(
        { id: "user-id", companyId: "company-id" } as never,
        "entry-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  it("impede alterar dados financeiros depois de qualquer liquidação", async () => {
    const update = vi.fn();
    const prisma = {
      financialEntry: {
        findFirst: vi.fn().mockResolvedValue({
          id: "entry-id",
          kind: "EXPENSE",
          totalAmount: "100.00",
          counterpartyId: "counterparty-id",
          categoryId: "category-id",
          projectId: null,
          accountId: "account-id",
          installments: [{ status: "SETTLED" }],
          recurrence: null,
        }),
        update,
      },
    };
    const updateService = new FinancialService(prisma as never, {} as never);

    await expect(
      updateService.update(
        { id: "user-id", companyId: "company-id" } as never,
        "entry-id",
        { totalAmount: 120 },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejeita liquidação em uma conta diferente da vinculada", async () => {
    const accountFind = vi.fn();
    const prisma = {
      financialInstallment: {
        findFirst: vi.fn().mockResolvedValue({
          id: "installment-id",
          entryId: "entry-id",
          status: "PENDING",
          entry: {
            publicCode: "PAG-0001",
            accountId: "planned-account-id",
          },
        }),
      },
      financialAccount: { findFirst: accountFind },
    };
    const settleService = new FinancialService(prisma as never, {} as never);

    await expect(
      settleService.settle(
        { id: "user-id", companyId: "company-id" } as never,
        "installment-id",
        { accountId: "other-account-id" },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(accountFind).not.toHaveBeenCalled();
  });
});
