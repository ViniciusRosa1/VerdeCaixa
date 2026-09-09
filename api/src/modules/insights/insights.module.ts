import { Module } from '@nestjs/common';
import { HealthController, InsightsController } from './insights.controller.js';
import { InsightsService } from './insights.service.js';

@Module({ controllers: [HealthController, InsightsController], providers: [InsightsService] })
export class InsightsModule {}
