import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  sessionId: string;
  membershipId?: string;
  companyId: string;
  roleId: string;
  email: string;
  permissions: string[];
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  return context.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
