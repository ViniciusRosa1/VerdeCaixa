import { describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./auth.guard.js";

const contextFor = (request: Record<string, unknown>) => ({
  getHandler: vi.fn(), getClass: vi.fn(),
  switchToHttp: () => ({ getRequest: () => request }),
});

function guardWith(session: unknown) {
  return new AuthGuard(
    { getAllAndOverride: vi.fn().mockReturnValue(false) } as never,
    { verifyAsync: vi.fn().mockResolvedValue({ sub: "user-1", sid: "session-1" }) } as never,
    { getOrThrow: vi.fn().mockReturnValue("secret") } as never,
    { session: { findFirst: vi.fn().mockResolvedValue(session) } } as never,
  );
}

describe("AuthGuard multiempresa", () => {
  it("bloqueia endpoints de negócio até a troca da senha temporária", async () => {
    const guard = guardWith({
      id: "session-1", user: { id: "user-1", email: "maria@example.com", status: "ACTIVE", deactivatedAt: null, mustChangePassword: true },
      activeMembership: null,
    });
    const request = { cookies: { vc_access: "token" }, path: "/api/v1/dashboard" };
    await expect(guard.canActivate(contextFor(request) as never)).rejects.toMatchObject({ status: 403 });
  });

  it("bloqueia endpoints de negócio sem empresa selecionada", async () => {
    const guard = guardWith({
      id: "session-1", user: { id: "user-1", email: "maria@example.com", status: "ACTIVE", deactivatedAt: null, mustChangePassword: false },
      activeMembership: null,
    });
    const request = { cookies: { vc_access: "token" }, path: "/api/v1/dashboard" };
    await expect(guard.canActivate(contextFor(request) as never)).rejects.toMatchObject({ status: 403 });
  });

  it("monta permissões a partir do vínculo ativo", async () => {
    const guard = guardWith({
      id: "session-1", user: { id: "user-1", email: "maria@example.com", status: "ACTIVE", deactivatedAt: null, mustChangePassword: false },
      activeMembership: {
        id: "membership-1", companyId: "company-1", roleId: "role-1", status: "ACTIVE", deactivatedAt: null,
        role: { deactivatedAt: null, permissions: [{ permission: { code: "entries.view" } }] },
      },
    });
    const request: Record<string, unknown> = { cookies: { vc_access: "token" }, path: "/api/v1/dashboard" };
    await expect(guard.canActivate(contextFor(request) as never)).resolves.toBe(true);
    expect(request.user).toMatchObject({ membershipId: "membership-1", companyId: "company-1", permissions: ["entries.view"] });
  });
});
