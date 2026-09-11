import { describe, expect, it, vi } from "vitest";
import { InsightsService } from "./insights.service.js";

describe("InsightsService cash flow", () => {
  it("agrupa por todos os dias quando o filtro está dentro do mesmo mês", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        settledAt: new Date("2026-09-10T12:00:00Z"),
        amount: "150.00",
        installment: { entry: { kind: "INCOME" } },
      },
    ]);
    const service = new InsightsService({ settlement: { findMany } } as never);
    const result = await (service as any).cashFlow("company-id", {
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(result).toHaveLength(30);
    expect(result[9]).toEqual({ month: "10", income: "150.00", expense: "0.00" });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ installment: { entry: { companyId: "company-id", canceledAt: null } } }),
    }));
  });
});
