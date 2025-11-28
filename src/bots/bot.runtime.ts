import { PrismaClient } from '@prisma/client';
import { botService } from './bot.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

class BotRuntime {
  private evaluationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot runtime already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting bot runtime engine');

    await this.scheduleAllBots();

    setInterval(() => {
      this.scheduleAllBots();
    }, 60000);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Stopping bot runtime engine');

    for (const [botId, interval] of this.evaluationIntervals.entries()) {
      clearInterval(interval);
      this.evaluationIntervals.delete(botId);
    }
  }

  async scheduleAllBots(): Promise<void> {
    try {
      const activeBots = await prisma.bot.findMany({
        where: {
          isActive: true,
        },
      });

      for (const bot of activeBots) {
        if (!this.evaluationIntervals.has(bot.id)) {
          this.scheduleBot(bot.id, (bot.config as any).evaluationInterval || 60);
        }
      }

      for (const [botId] of this.evaluationIntervals.entries()) {
        const botExists = activeBots.find((b) => b.id === botId);
        if (!botExists) {
          this.unscheduleBot(botId);
        }
      }

      logger.info(`Scheduled ${activeBots.length} active bots`);
    } catch (error) {
      logger.error('Error scheduling bots:', error);
    }
  }

  private scheduleBot(botId: string, intervalSeconds: number): void {
    const interval = setInterval(async () => {
      try {
        await botService.evaluateBot(botId);
      } catch (error) {
        logger.error(`Error in bot ${botId} evaluation:`, error);
      }
    }, intervalSeconds * 1000);

    this.evaluationIntervals.set(botId, interval);
    logger.info(`Bot ${botId} scheduled for evaluation every ${intervalSeconds}s`);

    botService.evaluateBot(botId).catch((error) => {
      logger.error(`Error in initial bot ${botId} evaluation:`, error);
    });
  }

  private unscheduleBot(botId: string): void {
    const interval = this.evaluationIntervals.get(botId);
    if (interval) {
      clearInterval(interval);
      this.evaluationIntervals.delete(botId);
      logger.info(`Bot ${botId} unscheduled`);
    }
  }

  async evaluateBotNow(botId: string): Promise<void> {
    try {
      await botService.evaluateBot(botId);
      logger.info(`Bot ${botId} evaluated on demand`);
    } catch (error) {
      logger.error(`Error evaluating bot ${botId} on demand:`, error);
      throw error;
    }
  }

  getScheduledBots(): string[] {
    return Array.from(this.evaluationIntervals.keys());
  }

  isScheduled(botId: string): boolean {
    return this.evaluationIntervals.has(botId);
  }
}

export const botRuntime = new BotRuntime();
