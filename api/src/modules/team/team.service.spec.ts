import { describe, expect, it, vi } from "vitest";
import * as argon2 from "argon2";
import { TeamService } from "./team.service.js";

describe("TeamService detail queries", () => {
  it("remove o hash e retorna o relacionamento do papel", async () => {
    const service = new TeamService({ companyMembership: { findFirst: vi.fn().mockResolvedValue({ id: "membership-id", userId: "user-id", companyId: "company-id", roleId: "role-id", status: "ACTIVE", activatedAt: null, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date(), user: { name: "Maria", email: "maria@example.com", lastLoginAt: null, mustChangePassword: false }, role: { id: "role-id", name: "Gestor" }, company: { id: "company-id", name: "Empresa" } }) } } as never, {} as never, {} as never, {} as never);
    const user = await service.user("company-id", "user-id");
    expect(user).toMatchObject({ id: "membership-id", userId: "user-id", role: { name: "Gestor" } });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("normaliza permissões e quantidade de usuários do papel", async () => {
    const service = new TeamService({ role: { findFirst: vi.fn().mockResolvedValue({ id: "role-id", permissions: [{ permission: { code: "entries.view" } }], _count: { memberships: 2 } }) } } as never, {} as never, {} as never, {} as never);
    await expect(service.role("company-id", "role-id")).resolves.toMatchObject({ permissions: ["entries.view"], users: 2 });
  });
});

describe("Convites multiempresa", () => {
  it("provisiona usuário novo com senha temporária armazenada somente como hash", async () => {
    const tx = {
      user: { create: vi.fn().mockResolvedValue({ id: "user-new" }) },
      companyMembership: { create: vi.fn().mockResolvedValue({ id: "membership-new", userId: "user-new", status: "ACTIVE" }) },
      userInvitation: { create: vi.fn() }, notification: { create: vi.fn() },
    };
    const prisma = {
      role: { findFirst: vi.fn().mockResolvedValue({ id: "role-1" }) },
      company: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "company-1", name: "Empresa" }) },
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback) => callback(tx)),
    };
    const mail = { send: vi.fn().mockResolvedValue(undefined) };
    const service = new TeamService(prisma as never, {} as never, mail as never, { get: vi.fn().mockReturnValue("http://localhost:3000") } as never);
    await service.invite("company-1", { name: "Maria", email: "MARIA@example.com", roleId: "role-1" });
    const passwordHash = tx.user.create.mock.calls[0]![0].data.passwordHash;
    const message = mail.send.mock.calls[0]![2] as string;
    const temporaryPassword = message.match(/Senha temporária: ([^\n]+)/)?.[1];
    expect(temporaryPassword).toBeTruthy();
    expect(passwordHash).not.toBe(temporaryPassword);
    expect(await argon2.verify(passwordHash, temporaryPassword!)).toBe(true);
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: "maria@example.com", mustChangePassword: true }) });
  });

  it("impede que outra conta aceite o token", async () => {
    const prisma = { userInvitation: { findUnique: vi.fn().mockResolvedValue({
      id: "invite-1", email: "maria@example.com", acceptedAt: null, expiresAt: new Date(Date.now() + 60_000),
      membership: { id: "membership-1", userId: "user-1", status: "PENDING", company: { name: "Empresa" }, role: {}, user: {} },
    }) } };
    const service = new TeamService(prisma as never, {} as never, {} as never, {} as never);
    await expect(service.accept("user-2", "outra@example.com", "session-2", { token: "token" })).rejects.toMatchObject({ status: 400 });
  });

  it("ativa somente o vínculo pendente e consome o convite", async () => {
    const invitation = {
      id: "invite-1", email: "maria@example.com", acceptedAt: null, expiresAt: new Date(Date.now() + 60_000),
      membership: { id: "membership-1", userId: "user-1", companyId: "company-1", status: "PENDING", company: { name: "Empresa" }, role: {}, user: {} },
    };
    const tx = {
      companyMembership: { update: vi.fn().mockResolvedValue({ id: "membership-1", companyId: "company-1", status: "ACTIVE" }) },
      userInvitation: { update: vi.fn() }, session: { update: vi.fn() }, notification: { create: vi.fn() }, auditLog: { create: vi.fn() },
    };
    const prisma = { userInvitation: { findUnique: vi.fn().mockResolvedValue(invitation) }, $transaction: vi.fn(async (callback) => callback(tx)) };
    const service = new TeamService(prisma as never, {} as never, {} as never, {} as never);
    await expect(service.accept("user-1", "MARIA@example.com", "session-1", { token: "token" })).resolves.toMatchObject({ id: "membership-1", status: "ACTIVE" });
    expect(tx.companyMembership.update).toHaveBeenCalledWith({ where: { id: "membership-1" }, data: expect.objectContaining({ status: "ACTIVE" }) });
    expect(tx.userInvitation.update).toHaveBeenCalledWith({ where: { id: "invite-1" }, data: { acceptedAt: expect.any(Date) } });
    expect(tx.session.update).toHaveBeenCalledWith({ where: { id: "session-1" }, data: { activeMembershipId: "membership-1" } });
  });
});
