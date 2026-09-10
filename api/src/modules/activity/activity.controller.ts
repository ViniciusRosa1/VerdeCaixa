import { Controller, Get, Inject, Param, Patch, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../../common/current-user.decorator.js";
import { ListQueryDto } from "../../common/dto.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { ActivityService } from "./activity.service.js";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(
    @Inject(ActivityService) private readonly service: ActivityService,
  ) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) {
    return this.service.notifications(u.companyId, u.id, q);
  }
  @Patch("read-all") readAll(@CurrentUser() u: AuthUser) {
    return this.service.readAll(u.companyId, u.id);
  }
  @Patch(":id/read") read(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.read(u.companyId, u.id, id);
  }
}

@ApiTags("audit")
@Controller("audit-logs")
@RequirePermissions("audit.view")
export class AuditController {
  constructor(
    @Inject(ActivityService) private readonly service: ActivityService,
  ) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) {
    return this.service.audit(u.companyId, q);
  }
}
