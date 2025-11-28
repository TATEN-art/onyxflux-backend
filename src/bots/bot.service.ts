import { PrismaClient } from '@prisma/client';
import {
  BotCreateInput,
  BotUpdateInput,
  BotConfig,
  BotWithSignals,
  RISK_LEVEL_CONFIG,
} from './types';
import { botEngine } from './bot.engine';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

class BotService {
  async createBot(userId: string, input: BotCreateInput): Promise<any> {
    try {
      const riskConfig = RISK_LEVEL_CONFIG[input.riskLevel];

      const config: BotConfig = {
        chain: input.chain,
        tokenAddress: input.tokenAddress,
        tokenSymbol: undefined,
        strategy: input.strategy,
        riskLevel: input.riskLevel,
        evaluationInterval: this.getEvaluationInterval(input.riskLevel),
        maxCapitalAllocation: riskConfig.maxCapitalAllocation,
        stopLossPercentage: riskConfig.stopLossPercentage,
        takeProfitPercentage: riskConfig.takeProfitPercentage,
        enableNotifications: input.enableNotifications || false,
      };

      const bot = await prisma.bot.create({
        data: {
          userId,
          name: input.name,
          chain: input.chain,
          tokenAddress: input.tokenAddress,
          tokenSymbol: null,
          strategy: input.strategy,
          riskLevel: input.riskLevel,
          isActive: true,
          config: config as any,
        },
      });

      await this.createAuditLog(bot.id, 'bot_created', {
        name: input.name,
        chain: input.chain,
        strategy: input.strategy,
        riskLevel: input.riskLevel,
      });

      logger.info(`Bot ${bot.id} created for user ${userId}`);

      return bot;
    } catch (error) {
      logger.error('Error creating bot:', error);
      throw error;
    }
  }

  async getBotById(botId: string, userId: string): Promise<BotWithSignals | null> {
    try {
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId,
        },
        include: {
          signals: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!bot) return null;

      const latestSignal = bot.signals[0] || undefined;

      return {
        ...bot,
        config: bot.config as BotConfig,
        latestSignal,
      } as BotWithSignals;
    } catch (error) {
      logger.error('Error fetching bot:', error);
      throw error;
    }
  }

  async listBots(userId: string): Promise<any[]> {
    try {
      const bots = await prisma.bot.findMany({
        where: {
          userId,
        },
        include: {
          signals: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return bots.map((bot) => ({
        ...bot,
        config: bot.config as BotConfig,
        latestSignal: bot.signals[0] || null,
      }));
    } catch (error) {
      logger.error('Error listing bots:', error);
      throw error;
    }
  }

  async updateBot(botId: string, userId: string, input: BotUpdateInput): Promise<any> {
    try {
      const existingBot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId,
        },
      });

      if (!existingBot) {
        throw new Error('Bot not found');
      }

      const config = existingBot.config as BotConfig;

      if (input.strategy) {
        config.strategy = input.strategy;
      }

      if (input.riskLevel) {
        config.riskLevel = input.riskLevel;
        const riskConfig = RISK_LEVEL_CONFIG[input.riskLevel];
        config.maxCapitalAllocation = riskConfig.maxCapitalAllocation;
        config.stopLossPercentage = riskConfig.stopLossPercentage;
        config.takeProfitPercentage = riskConfig.takeProfitPercentage;
        config.evaluationInterval = this.getEvaluationInterval(input.riskLevel);
      }

      if (input.enableNotifications !== undefined) {
        config.enableNotifications = input.enableNotifications;
      }

      const bot = await prisma.bot.update({
        where: {
          id: botId,
        },
        data: {
          name: input.name || existingBot.name,
          strategy: input.strategy || existingBot.strategy,
          riskLevel: input.riskLevel || existingBot.riskLevel,
          isActive: input.isActive !== undefined ? input.isActive : existingBot.isActive,
          config: config as any,
        },
      });

      await this.createAuditLog(botId, 'bot_updated', input);

      logger.info(`Bot ${botId} updated`);

      return bot;
    } catch (error) {
      logger.error('Error updating bot:', error);
      throw error;
    }
  }

  async deleteBot(botId: string, userId: string): Promise<void> {
    try {
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId,
        },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      await prisma.bot.delete({
        where: {
          id: botId,
        },
      });

      logger.info(`Bot ${botId} deleted`);
    } catch (error) {
      logger.error('Error deleting bot:', error);
      throw error;
    }
  }

  async evaluateBot(botId: string): Promise<void> {
    try {
      const bot = await prisma.bot.findUnique({
        where: {
          id: botId,
        },
      });

      if (!bot || !bot.isActive) {
        return;
      }

      const chain = bot.chain as 'ethereum' | 'base';
      const tokenSymbol = bot.tokenSymbol || 'UNKNOWN';

      const evaluation = await botEngine.evaluateBot(
        bot.id,
        chain,
        bot.tokenAddress,
        tokenSymbol,
        bot.strategy as any,
        bot.riskLevel as any
      );

      await prisma.botSignal.create({
        data: {
          botId: bot.id,
          signalType: evaluation.signal,
          confidence: evaluation.confidence,
          entryPrice: evaluation.entryPrice,
          exitPrice: evaluation.exitPrice,
          stopLoss: evaluation.stopLoss,
          takeProfit: evaluation.takeProfit,
          capitalAllocation: evaluation.capitalAllocation,
          reasoning: evaluation.reasoning,
          novaData: evaluation.novaData as any,
        },
      });

      if (evaluation.signal !== 'hold') {
        await this.createAuditLog(bot.id, 'signal_generated', {
          signal: evaluation.signal,
          confidence: evaluation.confidence,
        });
      }

      logger.info(`Bot ${botId} evaluated: ${evaluation.signal} signal`);
    } catch (error) {
      logger.error(`Error evaluating bot ${botId}:`, error);
      await this.createAuditLog(botId, 'evaluation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getBotSignals(botId: string, userId: string, limit: number = 50): Promise<any[]> {
    try {
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId,
        },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      const signals = await prisma.botSignal.findMany({
        where: {
          botId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return signals;
    } catch (error) {
      logger.error('Error fetching bot signals:', error);
      throw error;
    }
  }

  private async createAuditLog(botId: string, action: string, details: any): Promise<void> {
    try {
      await prisma.botAuditLog.create({
        data: {
          botId,
          action,
          details: details as any,
        },
      });
    } catch (error) {
      logger.error('Error creating audit log:', error);
    }
  }

  private getEvaluationInterval(riskLevel: string): number {
    switch (riskLevel) {
      case 'low':
        return 120;
      case 'medium':
        return 60;
      case 'high':
        return 30;
      default:
        return 60;
    }
  }
}

export const botService = new BotService();
