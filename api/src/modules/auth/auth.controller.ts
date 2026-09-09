import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator.js';
import { Public } from '../../common/public.decorator.js';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public() @Get('csrf')
  csrf(@Res({ passthrough: true }) response: Response) {
    const token = randomBytes(24).toString('base64url');
    response.cookie('vc_csrf', token, this.cookie(false, '/'));
    return { csrfToken: token };
  }

  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @ApiTooManyRequestsResponse()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto, request.header('user-agent'), request.ip);
    this.setSessionCookies(response, result.access, result.refresh);
    return { user: result.user };
  }

  @Public() @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(request.cookies?.vc_refresh as string | undefined);
    this.setSessionCookies(response, result.access, result.refresh);
    return { user: result.user };
  }

  @Public() @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.vc_refresh as string | undefined);
    response.clearCookie('vc_access', { path: '/api' });
    response.clearCookie('vc_refresh', { path: '/api/v1/auth' });
    return { message: 'Sessão encerrada.' };
  }

  @Get('me') me(@CurrentUser() user: AuthUser) { return this.auth.me(user.id); }
  @Public() @Post('forgot-password') forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto); }
  @Public() @Post('reset-password') reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }

  private setSessionCookies(response: Response, access: string, refresh: string) {
    response.cookie('vc_access', access, { ...this.cookie(true, '/api'), maxAge: 15 * 60_000 });
    response.cookie('vc_refresh', refresh, { ...this.cookie(true, '/api/v1/auth'), maxAge: 7 * 86_400_000 });
  }

  private cookie(httpOnly: boolean, path: string) {
    return { httpOnly, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path };
  }
}
