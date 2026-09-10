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
import { RequirePermissions } from "../auth/permissions.decorator.js";
import {
  CreateFinancialEntryDto,
  FinancialListQueryDto,
  SettleDto,
  UpdateFinancialEntryDto,
} from "./financial.dto.js";
import { FinancialService } from "./financial.service.js";

@ApiTags("financial-entries")
@Controller("financial-entries")
@RequirePermissions("entries.view")
export class FinancialController {
  constructor(
    @Inject(FinancialService) private readonly service: FinancialService,
  ) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: FinancialListQueryDto) {
    return this.service.list(u.companyId, q);
  }
  @Get(":id") get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.service.get(u.companyId, id);
  }
  @Post() @RequirePermissions("entries.create") create(
    @CurrentUser() u: AuthUser,
    @Body() d: CreateFinancialEntryDto,
  ) {
    return this.service.create(u, d);
  }
  @Patch(":id") @RequirePermissions("entries.edit") update(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() d: UpdateFinancialEntryDto,
  ) {
    return this.service.update(u, id, d);
  }
  @Delete(":id") @RequirePermissions("entries.cancel") cancel(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.cancel(u, id);
  }
}

@ApiTags("settlements")
@Controller("financial-installments")
export class SettlementsController {
  constructor(
    @Inject(FinancialService) private readonly service: FinancialService,
  ) {}
  @Post(":id/settlements") @RequirePermissions("entries.settle") settle(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
    @Body() d: SettleDto,
  ) {
    return this.service.settle(u, id, d);
  }

  @Delete(":id/settlements") @RequirePermissions("entries.settle") reverse(
    @CurrentUser() u: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.reverseSettlement(u, id);
  }
}
