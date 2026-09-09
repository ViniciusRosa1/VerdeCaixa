import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';
import { CsrfGuard } from './csrf.guard.js';
import { PermissionGuard } from './permission.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, CsrfGuard, PermissionGuard],
  exports: [AuthService, AuthGuard, CsrfGuard, PermissionGuard, JwtModule],
})
export class AuthModule {}
