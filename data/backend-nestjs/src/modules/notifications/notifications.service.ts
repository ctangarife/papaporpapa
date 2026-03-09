import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';
import { User } from '../users/entities/user.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class NotificationsService {
  // Banco de mensajes tipo Sherpa (Gentle Nudges)
  private readonly INCENTIVE_MESSAGES = [
    "👋 Hey, tus monedas se sienten solas. ¿Vamos por unas más?",
    "Tienes una papa esperando turno. Fácil y rápida.",
    "¿Un minutito? Solo para ver cuánto llevamos.",
    "💰 Tus monedas crecen cuando las visitas. ¿Pasas por la app?",
    "Una papa rápida no duele. ¡Dale!",
    "Tu proyecto te extraña... solo un poquito.",
  ];

  private readonly RECONNECTION_MESSAGES = [
    "Solo pasaba a saludar. Aquí sigo, sin apuros.",
    "¿Mucho trabajo? Tu lista sigue aquí cuando quieras.",
    "Recuerda: papa por papa. Sin prisas.",
    "Sin presión, solo un recordatorio suave.",
    "Aquí estoy, esperándote. Cuando puedas.",
    "Un pequeño toque para recordarte que existo.",
    "Olvídate del estrés. Tu ritmo, tus tiempos.",
    "¿Todo bien? Solo pasaba a decir hola.",
  ];

  constructor(
    @InjectRepository(NotificationPreference)
    private preferencesRepository: Repository<NotificationPreference>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Get user's notification preferences
   * Creates default preferences if they don't exist
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences for new user
      preferences = this.preferencesRepository.create({
        userId,
        enabled: true,
        frequencyHours: 4,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    const preferences = await this.getPreferences(userId);

    Object.assign(preferences, dto);
    return this.preferencesRepository.save(preferences);
  }

  /**
   * Update user's last interaction timestamp
   */
  async updateLastInteraction(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastInteractionAt: new Date(),
    });
  }

  /**
   * Get a random message for gentle nudges
   * @param type 'incentive' | 'reconnection'
   */
  getRandomMessage(type: 'incentive' | 'reconnection' = 'reconnection'): string {
    const messages = type === 'incentive'
      ? this.INCENTIVE_MESSAGES
      : this.RECONNECTION_MESSAGES;

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Check if user should receive a gentle nudge
   */
  async shouldSendNudge(userId: string): Promise<boolean> {
    const [preferences, user] = await Promise.all([
      this.getPreferences(userId),
      this.usersRepository.findOne({ where: { id: userId } }),
    ]);

    if (!preferences || !preferences.enabled) {
      return false;
    }

    if (!user.lastInteractionAt) {
      return false;
    }

    // Check if we're in quiet hours
    if (this.isInQuietHours(preferences)) {
      return false;
    }

    // Check if enough time has passed since last interaction
    const hoursSinceLastInteraction = this.getHoursSince(user.lastInteractionAt);
    return hoursSinceLastInteraction >= preferences.frequencyHours;
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(preferences: NotificationPreference): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }

  /**
   * Get hours since a given date
   */
  private getHoursSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return diffMs / (1000 * 60 * 60);
  }
}
