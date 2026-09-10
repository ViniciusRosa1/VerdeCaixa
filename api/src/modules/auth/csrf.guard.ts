import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
    const cookie = request.cookies?.vc_csrf as string | undefined;
    const header = request.header("x-csrf-token");
    if (!cookie || !header || cookie !== header)
      throw new ForbiddenException("Token CSRF inválido");
    return true;
  }
}
