import prisma from '../config/database';
import { Logger } from '../utils/logger';

const logger = new Logger('BotsService');

export interface CreateBotData {
  userId: string;
  token: string;
  strategyType: string;
  riskLevel: string;
  timeframe: string;
  notificationsEnabled?: boolean;
}

export class BotsService {
  async listBots(userId: string) {
    try {
      const bots = await prisma.botConfig.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return bots;
    } catch (error) {
      logger.error('Error listing bots:', error);
      throw new Error('Failed to list bots');
    }
  }

  async createBot(data: CreateBotData) {
    try {
      const bot = await prisma.botConfig.create({
        data: {
          userId: data.userId,
          token: data.token,
          strategyType: data.strategyType,
          riskLevel: data.riskLevel,
          timeframe: data.timeframe,
          notificationsEnabled: data.notificationsEnabled ?? true,
          status: 'active',
        },
      });

      logger.info(`Bot created: ${bot.id} for user ${data.userId}`);

      return bot;
    } catch (error) {
      logger.error('Error creating bot:', error);
      throw new Error('Failed to create bot');
    }
  }

  async getBot(botId: string, userId: string) {
    try {
      const bot = await prisma.botConfig.findFirst({
        where: {
          id: botId,
          userId,
        },
      });

      if (!bot) {
        throw new Error('Bot not found or unauthorized');
      }

      return bot;
    } catch (error) {
      logger.error('Error getting bot:', error);
      throw error;
    }
  }

  async deleteBot(botId: string, userId: string) {
    try {
      const bot = await prisma.botConfig.findFirst({
        where: {
          id: botId,
          userId,
        },
      });

      if (!bot) {
        throw new Error('Bot not found or unauthorized');
      }

      await prisma.botConfig.delete({
        where: { id: botId },
      });

      logger.info(`Bot deleted: ${botId} for user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting bot:', error);
      throw error;
    }
  }

  async updateBotStatus(botId: string, userId: string, status: string) {
    try {
      const bot = await prisma.botConfig.findFirst({
        where: {
          id: botId,
          userId,
        },
      });

      if (!bot) {
        throw new Error('Bot not found or unauthorized');
      }

      const updated = await prisma.botConfig.update({
        where: { id: botId },
        data: { status },
      });

      logger.info(`Bot status updated: ${botId} to ${status}`);

      return updated;
    } catch (error) {
      logger.error('Error updating bot status:', error);
      throw error;
    }
  }
}
