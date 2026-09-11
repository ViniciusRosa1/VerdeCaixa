import { describe, expect, it, vi } from "vitest";
import { DirectoryService } from "./directory.service.js";

describe("DirectoryService detail queries", () => {
  it("busca cliente pelo id, empresa e tipo permitido", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "client-id", companyId: "company-id", kind: "CLIENT" });
    const service = new DirectoryService({ counterparty: { findFirst } } as never, {} as never);
    await expect(service.getCounterparty("company-id", "client-id", "CLIENT")).resolves.toMatchObject({ id: "client-id" });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "client-id", companyId: "company-id", kind: { in: ["CLIENT", "BOTH"] } } });
  });

  it("não revela registros ausentes ou pertencentes a outra empresa", async () => {
    const service = new DirectoryService({ category: { findFirst: vi.fn().mockResolvedValue(null) } } as never, {} as never);
    await expect(service.getCategory("company-a", "category-from-b")).rejects.toMatchObject({ status: 404 });
  });

  it("retorna projeto com cliente e resultado liquidado", async () => {
    const service = new DirectoryService({ project: { findFirst: vi.fn().mockResolvedValue({ id: "project-id", client: { id: "client-id" }, entries: [{ kind: "INCOME", installments: [{ settlement: { amount: "125.50" } }] }, { kind: "EXPENSE", installments: [{ settlement: { amount: "25.50" } }] }] }) } } as never, {} as never);
    await expect(service.getProject("company-id", "project-id")).resolves.toMatchObject({ id: "project-id", client: { id: "client-id" }, result: "100.00" });
  });
});
