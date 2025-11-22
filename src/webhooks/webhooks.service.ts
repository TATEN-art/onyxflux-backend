import prisma from '../config/database';
import { Logger } from '../utils/logger';
import { generateWebhookSecret } from '../utils/crypto';
import axios from 'axios';
import crypto from 'crypto';

const logger = new Logger('WebhooksService');

export class WebhooksService {
  async createWebhook(userId: string, url: string, events: string[]): Promise<{
    id: string;
    secret: string;
  }> {
    const secret = generateWebhookSecret();

    const webhook = await prisma.webhook.create({
      data: {
        userId,
        url,
        events,
        secret,
      },
    });

    logger.info(`Webhook created for user ${userId}: ${url}`);

    return {
      id: webhook.id,
      secret: webhook.secret,
    };
  }

  async listWebhooks(userId: string) {
    return prisma.webhook.findMany({
      where: { userId },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async deleteWebhook(userId: string, webhookId: string): Promise<void> {
    await prisma.webhook.deleteMany({
      where: { id: webhookId, userId },
    });

    logger.info(`Webhook deleted: ${webhookId}`);
  }

  async toggleWebhook(userId: string, webhookId: string, active: boolean): Promise<void> {
    await prisma.webhook.updateMany({
      where: { id: webhookId, userId },
      data: { active },
    });

    logger.info(`Webhook ${webhookId} ${active ? 'activated' : 'deactivated'}`);
  }

  async deliverWebhook(userId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: {
          userId,
          active: true,
          events: { has: event },
        },
      });

      for (const webhook of webhooks) {
        await this.sendWebhook(webhook.id, webhook.url, webhook.secret, event, payload);
      }
    } catch (error) {
      logger.error('Webhook delivery error:', error);
    }
  }

  private async sendWebhook(
    webhookId: string,
    url: string,
    secret: string,
    event: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const body = JSON.stringify({ event, timestamp, data: payload });
      
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-OnyxFlux-Signature': signature,
          'X-OnyxFlux-Event': event,
          'X-OnyxFlux-Timestamp': timestamp.toString(),
        },
        timeout: 10000,
      });

      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          payload: { event, data: payload },
          status: response.status,
          response: response.data ? JSON.stringify(response.data) : null,
        },
      });

      logger.info(`Webhook delivered to ${url}: ${event}`);
    } catch (error: any) {
      logger.error(`Webhook delivery failed to ${url}:`, error);

      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          payload: { event, data: payload },
          status: error.response?.status || 0,
          response: error.message,
        },
      });
    }
  }

  async getWebhookDeliveries(userId: string, webhookId: string, limit: number = 50) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    return prisma.webhookDelivery.findMany({
      where: { webhookId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
