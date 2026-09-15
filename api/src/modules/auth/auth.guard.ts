import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../../common/public.decorator.js";
import { PrismaService } from "../../database/prisma.service.js";

const identityRoutes = [
  "/auth/me",
  "/auth/logout",
  "/auth/companies",
  "/auth/select-company",
  "/auth/change-initial-password",
  "/users/invitations/accept",
];

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = request.cookies?.vc_access as string | undefined;
    if (!token) throw new UnauthorizedException("Sessão não encontrada");
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid: string }>(token, {
        secret: this.config.getOrThrow("AUTH_ACCESS_SECRET"),
      });
      const session = await this.prisma.session.findFirst({
        where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
        include: {
          user: true,
          activeMembership: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        },
      });
      if (!session || session.user.status !== "ACTIVE" || session.user.deactivatedAt) throw new UnauthorizedException();
      const membership = session.activeMembership?.status === "ACTIVE" && !session.activeMembership.deactivatedAt && !session.activeMembership.role.deactivatedAt
        ? session.activeMembership
        : undefined;
      const identityOnly = identityRoutes.some((route) => request.path.endsWith(route));
      if (session.user.mustChangePassword && !request.path.endsWith("/auth/change-initial-password") && !request.path.endsWith("/auth/me") && !request.path.endsWith("/auth/logout")) {
        throw new ForbiddenException({ error: "PASSWORD_CHANGE_REQUIRED", message: "Troque sua senha temporária para continuar" });
      }
      if (!membership && !identityOnly) {
        throw new ForbiddenException({ error: "COMPANY_SELECTION_REQUIRED", message: "Selecione uma empresa para continuar" });
      }
      request.user = {
        id: session.user.id,
        sessionId: session.id,
        membershipId: membership?.id,
        companyId: membership?.companyId ?? "",
        roleId: membership?.roleId ?? "",
        email: session.user.email,
        permissions: membership?.role.permissions.map((item) => item.permission.code) ?? [],
      };
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException("Sessão expirada");
    }
  }
}
