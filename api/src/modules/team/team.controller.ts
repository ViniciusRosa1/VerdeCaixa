import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../../common/current-user.decorator.js";
import { ListQueryDto } from "../../common/dto.js";
import { Public } from "../../common/public.decorator.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import {
  AcceptInvitationDto,
  InviteUserDto,
  RoleDto,
  UpdateUserDto,
} from "./team.dto.js";
import { TeamService } from "./team.service.js";

@ApiTags("users")
@Controller("users")
@RequirePermissions("team.view")
export class UsersController {
  constructor(@Inject(TeamService) private readonly service: TeamService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) {
    return this.service.users(u.companyId, q);
  }
  @Get(":id") get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.user(u.companyId, id);
  }
  @Post("invitations") @RequirePermissions("team.manage") invite(
    @CurrentUser() u: AuthUser,
    @Body() d: InviteUserDto,
  ) {
    return this.service.invite(u.companyId, d);
  }
  @Patch(":id") @RequirePermissions("team.manage") update(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() d: UpdateUserDto,
  ) {
    return this.service.updateUser(u.companyId, id, d);
  }
  @Public() @Post("invitations/accept") accept(@Body() d: AcceptInvitationDto) {
    return this.service.accept(d);
  }
}

@ApiTags("roles")
@Controller("roles")
@RequirePermissions("roles.view")
export class RolesController {
  constructor(@Inject(TeamService) private readonly service: TeamService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) {
    return this.service.roles(u.companyId, q);
  }
  @Get("permissions") permissions() {
    return this.service.permissions();
  }
  @Get(":id") get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.role(u.companyId, id);
  }
  @Post() @RequirePermissions("roles.manage") create(
    @CurrentUser() u: AuthUser,
    @Body() d: RoleDto,
  ) {
    return this.service.createRole(u.companyId, d);
  }
  @Patch(":id") @RequirePermissions("roles.manage") update(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() d: RoleDto,
  ) {
    return this.service.updateRole(u.companyId, id, d);
  }
  @Delete(":id") @RequirePermissions("roles.manage") remove(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.deactivateRole(u.companyId, id);
  }
}
