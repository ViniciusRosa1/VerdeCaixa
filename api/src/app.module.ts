import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthGuard } from './modules/auth/auth.guard.js';
import { CsrfGuard } from './modules/auth/csrf.guard.js';
import { PermissionGuard } from './modules/auth/permission.guard.js';
import { CompanyModule } from './modules/company/company.module.js';
import { DirectoryModule } from './modules/directory/directory.module.js';
import { FinancialModule } from './modules/financial/financial.module.js';
import { InsightsModule } from './modules/insights/insights.module.js';
import { TeamModule } from './modules/team/team.module.js';
import { ActivityModule } from './modules/activity/activity.module.js';
import { MailModule } from './services/mail.module.js';
import { AuditInterceptor } from './common/audit.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    MailModule,
    AuthModule,
    CompanyModule,
    DirectoryModule,
    FinancialModule,
    InsightsModule,
    TeamModule,
    ActivityModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
