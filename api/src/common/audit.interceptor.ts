import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { mergeMap, type Observable } from 'rxjs';
import type { AuthUser } from './current-user.decorator.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    const route = request.path.replace(/^\/api\/v1\//, '').split('/')[0] ?? 'unknown';
    const shouldAudit = user && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !['financial-entries', 'financial-installments', 'notifications'].includes(route);
    if (!shouldAudit) return next.handle();
    return next.handle().pipe(mergeMap(async (result: unknown) => {
      const entityId = typeof result === 'object' && result && 'id' in result ? String((result as { id: unknown }).id) : String(request.params.id ?? user.id);
      await this.prisma.auditLog.create({ data: { companyId: user.companyId, actorId: user.id, action: request.method, entityType: route, entityId, summary: `${request.method} ${request.path}`, ipAddress: request.ip } });
      return result;
    }));
  }
}
