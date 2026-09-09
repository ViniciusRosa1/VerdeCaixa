import { Module } from '@nestjs/common';
import { AccountsController, CategoriesController, ClientsController, ProjectsController, SuppliersController } from './directory.controller.js';
import { DirectoryService } from './directory.service.js';

@Module({ controllers: [ClientsController, SuppliersController, CategoriesController, AccountsController, ProjectsController], providers: [DirectoryService] })
export class DirectoryModule {}
