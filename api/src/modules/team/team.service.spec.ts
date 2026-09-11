import { describe, expect, it, vi } from "vitest";
import { TeamService } from "./team.service.js";

describe("TeamService detail queries", () => {
  it("remove o hash e retorna o relacionamento do papel", async () => {
    const service = new TeamService({ user: { findFirst: vi.fn().mockResolvedValue({ id: "user-id", companyId: "company-id", passwordHash: "secret", role: { id: "role-id", name: "Gestor" } }) } } as never, {} as never, {} as never, {} as never);
    const user = await service.user("company-id", "user-id");
    expect(user).toMatchObject({ id: "user-id", role: { name: "Gestor" } });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("normaliza permissões e quantidade de usuários do papel", async () => {
    const service = new TeamService({ role: { findFirst: vi.fn().mockResolvedValue({ id: "role-id", permissions: [{ permission: { code: "entries.view" } }], _count: { users: 2 } }) } } as never, {} as never, {} as never, {} as never);
    await expect(service.role("company-id", "role-id")).resolves.toMatchObject({ permissions: ["entries.view"], users: 2 });
  });
});
