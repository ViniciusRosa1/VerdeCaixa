import { Controller, Get, Inject, Param, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  CurrentUser,
  type AuthUser,
} from "../../common/current-user.decorator.js";
import { Public } from "../../common/public.decorator.js";
import { PrismaService } from "../../database/prisma.service.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { ExportQueryDto, PeriodQueryDto } from "./insights.dto.js";
import { InsightsService } from "./insights.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Public() @Get() async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}

@ApiTags("insights")
@RequirePermissions("reports.view")
@Controller()
export class InsightsController {
  constructor(
    @Inject(InsightsService) private readonly service: InsightsService,
  ) {}
  @Get("dashboard") dashboard(@CurrentUser() u: AuthUser) {
    return this.service.dashboard(u.companyId);
  }
  @Get("agenda") agenda(
    @CurrentUser() u: AuthUser,
    @Query() q: PeriodQueryDto,
  ) {
    return this.service.agenda(u.companyId, q);
  }
  @Get("reports/:report") report(
    @CurrentUser() u: AuthUser,
    @Param("report") report: string,
    @Query() q: PeriodQueryDto,
  ) {
    return this.service.report(u.companyId, report, q);
  }
  @Get("reports/:report/export")
  @RequirePermissions("reports.export")
  async export(
    @CurrentUser() u: AuthUser,
    @Param("report") report: string,
    @Query() q: ExportQueryDto,
    @Res() response: Response,
  ) {
    const file = await this.service.export(u.companyId, report, q, q.format);
    response.setHeader("content-type", file.contentType);
    response.setHeader(
      "content-disposition",
      `attachment; filename="verde-caixa-${report}.${file.extension}"`,
    );
    response.send(file.data);
  }
}
