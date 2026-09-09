import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';

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
    if (!token) throw new UnauthorizedException('Sessão não encontrada');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.config.getOrThrow('AUTH_ACCESS_SECRET') });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, status: 'ACTIVE', deactivatedAt: null },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      });
      if (!user) throw new UnauthorizedException();
      request.user = {
        id: user.id,
        companyId: user.companyId,
        roleId: user.roleId,
        email: user.email,
        permissions: user.role.permissions.map((item) => item.permission.code),
      };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão expirada');
    }
  }
}
