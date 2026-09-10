import { Body, Controller, Get, Inject, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../../common/current-user.decorator.js";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { UpdateCompanyDto } from "./company.dto.js";
import { CompanyService } from "./company.service.js";

@ApiTags("company")
@Controller("company")
export class CompanyController {
  constructor(
    @Inject(CompanyService) private readonly service: CompanyService,
  ) {}
  @Get() @RequirePermissions("company.view") get(
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.get(user.companyId);
  }
  @Patch() @RequirePermissions("company.manage") update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.service.update(user.companyId, dto);
  }
}
