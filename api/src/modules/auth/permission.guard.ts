import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser } from "../../common/current-user.decorator.js";
import { PERMISSIONS_KEY } from "./permissions.decorator.js";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (
      !user ||
      !required.every((permission) => user.permissions.includes(permission))
    ) {
      throw new ForbiddenException(
        "Você não tem permissão para realizar esta ação",
      );
    }
    return true;
  }
}
