import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { AuditController, NotificationsController } from './activity.controller.js';

@Module({ controllers: [NotificationsController, AuditController], providers: [ActivityService] })
export class ActivityModule {}
