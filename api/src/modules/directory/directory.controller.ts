import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator.js';
import { ListQueryDto } from '../../common/dto.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { AccountDto, CategoryDto, CounterpartyDto, ProjectDto } from './directory.dto.js';
import { DirectoryService } from './directory.service.js';

@ApiTags('clients') @Controller('clients') @RequirePermissions('directories.view')
export class ClientsController {
  constructor(@Inject(DirectoryService) readonly service: DirectoryService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) { return this.service.listCounterparties(u.companyId, 'CLIENT', q); }
  @Post() @RequirePermissions('directories.manage') create(@CurrentUser() u: AuthUser, @Body() d: CounterpartyDto) { return this.service.createCounterparty(u.companyId, 'CLIENT', d); }
  @Patch(':id') @RequirePermissions('directories.manage') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: CounterpartyDto) { return this.service.updateCounterparty(u.companyId, id, d); }
  @Delete(':id') @RequirePermissions('directories.manage') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.deactivateCounterparty(u.companyId, id); }
}

@ApiTags('suppliers') @Controller('suppliers') @RequirePermissions('directories.view')
export class SuppliersController {
  constructor(@Inject(DirectoryService) readonly service: DirectoryService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) { return this.service.listCounterparties(u.companyId, 'SUPPLIER', q); }
  @Post() @RequirePermissions('directories.manage') create(@CurrentUser() u: AuthUser, @Body() d: CounterpartyDto) { return this.service.createCounterparty(u.companyId, 'SUPPLIER', d); }
  @Patch(':id') @RequirePermissions('directories.manage') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: CounterpartyDto) { return this.service.updateCounterparty(u.companyId, id, d); }
  @Delete(':id') @RequirePermissions('directories.manage') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.deactivateCounterparty(u.companyId, id); }
}

@ApiTags('categories') @Controller('categories') @RequirePermissions('directories.view')
export class CategoriesController {
  constructor(@Inject(DirectoryService) private readonly service: DirectoryService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) { return this.service.listCategories(u.companyId, q); }
  @Post() @RequirePermissions('directories.manage') create(@CurrentUser() u: AuthUser, @Body() d: CategoryDto) { return this.service.createCategory(u.companyId, d); }
  @Patch(':id') @RequirePermissions('directories.manage') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: CategoryDto) { return this.service.updateCategory(u.companyId, id, d); }
  @Delete(':id') @RequirePermissions('directories.manage') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.deactivateCategory(u.companyId, id); }
}

@ApiTags('financial-accounts') @Controller('financial-accounts') @RequirePermissions('directories.view')
export class AccountsController {
  constructor(@Inject(DirectoryService) private readonly service: DirectoryService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) { return this.service.listAccounts(u.companyId, q); }
  @Post() @RequirePermissions('directories.manage') create(@CurrentUser() u: AuthUser, @Body() d: AccountDto) { return this.service.createAccount(u.companyId, d); }
  @Patch(':id') @RequirePermissions('directories.manage') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: AccountDto) { return this.service.updateAccount(u.companyId, id, d); }
  @Delete(':id') @RequirePermissions('directories.manage') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.deactivateAccount(u.companyId, id); }
}

@ApiTags('projects') @Controller('projects') @RequirePermissions('projects.view')
export class ProjectsController {
  constructor(@Inject(DirectoryService) private readonly service: DirectoryService) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query() q: ListQueryDto) { return this.service.listProjects(u.companyId, q); }
  @Post() @RequirePermissions('projects.manage') create(@CurrentUser() u: AuthUser, @Body() d: ProjectDto) { return this.service.createProject(u.companyId, d); }
  @Patch(':id') @RequirePermissions('projects.manage') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() d: ProjectDto) { return this.service.updateProject(u.companyId, id, d); }
  @Delete(':id') @RequirePermissions('projects.manage') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.service.deactivateProject(u.companyId, id); }
}
