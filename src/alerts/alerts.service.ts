import prisma from '../config/database';
import { Logger } from '../utils/logger';
import { sendEmail, generateWhaleAlertEmail } from '../utils/email';
import { config } from '../config/env';

const logger = new Logger('AlertsService');

export interface Alert {
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  metadata?: Record<string, unknown>;
}

export class AlertsService {
  async createAlert(alert: Alert): Promise<void> {
    try {
      await prisma.alert.create({
        data: {
          userId: alert.userId,
          type: alert.type as any,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          metadata: (alert.metadata || {}) as any,
        },
      });

      logger.info(`Alert created for user ${alert.userId}: ${alert.type}`);
    } catch (error) {
      logger.error('Failed to create alert:', error);
    }
  }

  async sendEmailAlert(userId: string, alert: Alert): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        logger.error(`User ${userId} not found for email alert`);
        return;
      }

      let emailFrom = config.email.alertsFrom;
      if (alert.type.startsWith('WHALE_')) {
        emailFrom = config.email.whaleFrom;
      }

      await sendEmail({
        to: user.email,
        subject: alert.title,
        html: this.generateAlertEmail(alert),
        from: emailFrom,
      });

      logger.info(`Email alert sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send email alert:', error);
    }
  }

  private generateAlertEmail(alert: Alert): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
          .alert { padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .alert.high { border-left-color: #ef4444; background-color: #fee; }
          .alert.medium { border-left-color: #f59e0b; background-color: #fef3c7; }
          .alert.low { border-left-color: #3b82f6; background-color: #dbeafe; }
          .footer { color: #666; font-size: 12px; text-align: center; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${alert.title}</h1>
          <div class="alert ${alert.severity}">
            <p>${alert.message}</p>
          </div>
          ${alert.metadata ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
          <div class="footer">
            <p>© 2025 OnyxFlux. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async getUserAlerts(userId: string, limit: number = 50) {
    return prisma.alert.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAlertAsRead(userId: string, alertId: string): Promise<void> {
    await prisma.alert.updateMany({
      where: { id: alertId, userId },
      data: { read: true },
    });
  }

  async markAllAlertsAsRead(userId: string): Promise<void> {
    await prisma.alert.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.alert.count({
      where: { userId, read: false },
    });
  }
}
