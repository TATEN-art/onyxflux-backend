import { PrismaClient } from '@prisma/client';
import { streamManager } from '../ws/streamManager';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

class BotWebSocket {
  async streamBotSignals(botId: string, clientId: string): Promise<void> {
    try {
      const bot = await prisma.bot.findUnique({
        where: {
          id: botId,
        },
        include: {
          signals: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!bot) {
        throw new Error('Bot not found');
      }

      const latestSignal = bot.signals[0];

      if (latestSignal) {
        const message = {
          type: 'bot_signal',
          botId: bot.id,
          botName: bot.name,
          chain: bot.chain,
          tokenAddress: bot.tokenAddress,
          tokenSymbol: bot.tokenSymbol,
          strategy: bot.strategy,
          signal: {
            id: latestSignal.id,
            signalType: latestSignal.signalType,
            confidence: latestSignal.confidence,
            entryPrice: latestSignal.entryPrice,
            exitPrice: latestSignal.exitPrice,
            stopLoss: latestSignal.stopLoss,
            takeProfit: latestSignal.takeProfit,
            capitalAllocation: latestSignal.capitalAllocation,
            reasoning: latestSignal.reasoning,
            novaData: latestSignal.novaData,
            createdAt: latestSignal.createdAt,
          },
          timestamp: new Date().toISOString(),
        };

        streamManager.sendToClient(clientId, message);
      }

      logger.info(`Streamed bot ${botId} signals to client ${clientId}`);
    } catch (error) {
      logger.error(`Error streaming bot ${botId} signals:`, error);
      throw error;
    }
  }

  async streamAllUserBots(userId: string, clientId: string): Promise<void> {
    try {
      const bots = await prisma.bot.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          signals: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      const botsData = bots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        chain: bot.chain,
        tokenAddress: bot.tokenAddress,
        tokenSymbol: bot.tokenSymbol,
        strategy: bot.strategy,
        riskLevel: bot.riskLevel,
        isActive: bot.isActive,
        latestSignal: bot.signals[0] || null,
      }));

      const message = {
        type: 'user_bots',
        bots: botsData,
        count: bots.length,
        timestamp: new Date().toISOString(),
      };

      streamManager.sendToClient(clientId, message);

      logger.info(`Streamed ${bots.length} bots to client ${clientId}`);
    } catch (error) {
      logger.error('Error streaming user bots:', error);
      throw error;
    }
  }

  async broadcastBotSignal(botId: string): Promise<void> {
    try {
      const bot = await prisma.bot.findUnique({
        where: {
          id: botId,
        },
        include: {
          signals: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!bot || bot.signals.length === 0) {
        return;
      }

      const latestSignal = bot.signals[0];

      const message = {
        type: 'bot_signal',
        botId: bot.id,
        botName: bot.name,
        chain: bot.chain,
        tokenAddress: bot.tokenAddress,
        tokenSymbol: bot.tokenSymbol,
        strategy: bot.strategy,
        signal: {
          id: latestSignal.id,
          signalType: latestSignal.signalType,
          confidence: latestSignal.confidence,
          entryPrice: latestSignal.entryPrice,
          exitPrice: latestSignal.exitPrice,
          stopLoss: latestSignal.stopLoss,
          takeProfit: latestSignal.takeProfit,
          capitalAllocation: latestSignal.capitalAllocation,
          reasoning: latestSignal.reasoning,
          novaData: latestSignal.novaData,
          createdAt: latestSignal.createdAt,
        },
        timestamp: new Date().toISOString(),
      };

      streamManager.broadcastToSubscribers(`bot:${botId}`, message);

      logger.info(`Broadcasted bot ${botId} signal to subscribers`);
    } catch (error) {
      logger.error(`Error broadcasting bot ${botId} signal:`, error);
    }
  }

  subscribeToBotUpdates(botId: string, clientId: string): void {
    streamManager.subscribe(clientId, `bot:${botId}`);
    logger.info(`Client ${clientId} subscribed to bot ${botId} updates`);
  }

  unsubscribeFromBotUpdates(botId: string, clientId: string): void {
    streamManager.unsubscribe(clientId, `bot:${botId}`);
    logger.info(`Client ${clientId} unsubscribed from bot ${botId} updates`);
  }
}

export const botWebSocket = new BotWebSocket();
