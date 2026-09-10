import { Module } from "@nestjs/common";
import { RolesController, UsersController } from "./team.controller.js";
import { TeamService } from "./team.service.js";

@Module({
  controllers: [UsersController, RolesController],
  providers: [TeamService],
})
export class TeamModule {}
