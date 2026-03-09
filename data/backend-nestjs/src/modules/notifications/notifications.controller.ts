import { Controller, Get, Put, Body, UseGuards, Request, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreference } from './entities/notification-preference.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  async getPreferences(@Request() req): Promise<NotificationPreference> {
    return this.notificationsService.getPreferences(req.user.userId);
  }

  @Put('preferences')
  async updatePreferences(
    @Request() req,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    return this.notificationsService.updatePreferences(req.user.userId, dto);
  }

  @Post('track-interaction')
  async trackInteraction(@Request() req): Promise<{ success: boolean }> {
    await this.notificationsService.updateLastInteraction(req.user.userId);
    return { success: true };
  }

  @Get('test-nudge')
  async testNudge(@Request() req): Promise<{
    shouldSend: boolean;
    message?: string;
  }> {
    const shouldSend = await this.notificationsService.shouldSendNudge(req.user.userId);

    if (shouldSend) {
      return {
        shouldSend: true,
        message: this.notificationsService.getRandomMessage(),
      };
    }

    return { shouldSend: false };
  }
}
