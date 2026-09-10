import { Module } from "@nestjs/common";
import {
  FinancialController,
  SettlementsController,
} from "./financial.controller.js";
import { FinancialService } from "./financial.service.js";

@Module({
  controllers: [FinancialController, SettlementsController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
