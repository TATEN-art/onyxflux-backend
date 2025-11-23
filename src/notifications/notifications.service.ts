import prisma from '../config/database';
import { Logger } from '../utils/logger';

const logger = new Logger('NotificationsService');

export interface NotificationSettings {
  emailEnabled?: boolean;
  webhookEnabled?: boolean;
  whaleAlerts?: boolean;
  manipulationAlerts?: boolean;
  liquidityAlerts?: boolean;
  botSignals?: boolean;
}

export class NotificationsService {
  async listNotifications(userId: string) {
    const mockNotifications = [
      {
        id: '1',
        type: 'WHALE_BUY',
        title: 'Large Whale Buy Detected',
        message: 'Whale purchased $2.5M worth of ETH',
        severity: 'high',
        timestamp: Date.now() - 300000,
        read: false,
      },
      {
        id: '2',
        type: 'MANIPULATION_SPOOFING',
        title: 'Spoofing Activity Detected',
        message: 'Fake sell walls detected on BTC/USDT',
        severity: 'medium',
        timestamp: Date.now() - 600000,
        read: false,
      },
      {
        id: '3',
        type: 'LIQUIDITY_WARNING',
        title: 'Low Liquidity Alert',
        message: 'Liquidity dropped below threshold for MATIC',
        severity: 'low',
        timestamp: Date.now() - 900000,
        read: true,
      },
      {
        id: '4',
        type: 'BOT_SIGNAL',
        title: 'Bot Signal: Buy Opportunity',
        message: 'Your momentum bot detected a buy signal for SOL',
        severity: 'medium',
        timestamp: Date.now() - 1200000,
        read: true,
      },
    ];

    logger.info(`Returning mock notifications for user ${userId}`);
    return mockNotifications;
  }

  async sendTestNotification(userId: string) {
    logger.info(`Test notification sent for user ${userId}`);
    return { sent: true, message: 'Test notification sent successfully' };
  }

  async saveSettings(userId: string, settings: NotificationSettings) {
    try {
      const existing = await prisma.userNotificationSettings.findUnique({
        where: { userId },
      });

      let result;
      if (existing) {
        result = await prisma.userNotificationSettings.update({
          where: { userId },
          data: settings,
        });
      } else {
        result = await prisma.userNotificationSettings.create({
          data: {
            userId,
            ...settings,
          },
        });
      }

      logger.info(`Notification settings saved for user ${userId}`);
      return result;
    } catch (error) {
      logger.error('Error saving notification settings:', error);
      throw new Error('Failed to save notification settings');
    }
  }

  async getSettings(userId: string) {
    try {
      const settings = await prisma.userNotificationSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        return {
          emailEnabled: true,
          webhookEnabled: false,
          whaleAlerts: true,
          manipulationAlerts: true,
          liquidityAlerts: true,
          botSignals: true,
        };
      }

      return settings;
    } catch (error) {
      logger.error('Error getting notification settings:', error);
      throw new Error('Failed to get notification settings');
    }
  }
}
