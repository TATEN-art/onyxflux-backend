import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middlewares/auth';
import { botService } from './bot.service';
import { botRuntime } from './bot.runtime';
import { BotCreateInput, BotUpdateInput } from './types';
import { logger } from '../utils/logger';

interface BotIdParams {
  id: string;
}

interface BotCreateBody {
  name: string;
  chain: 'ethereum' | 'base' | 'bnb' | 'solana';
  tokenAddress: string;
  strategy: string;
  riskLevel: 'low' | 'medium' | 'high';
  enableNotifications?: boolean;
}

interface BotUpdateBody {
  name?: string;
  strategy?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  isActive?: boolean;
  enableNotifications?: boolean;
}

export async function botRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: BotCreateBody }>(
    '/bot/create',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: BotCreateBody }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { name, chain, tokenAddress, strategy, riskLevel, enableNotifications } = request.body;

        if (!name || !chain || !tokenAddress || !strategy || !riskLevel) {
          return reply.code(400).send({
            error: 'Missing required fields: name, chain, tokenAddress, strategy, riskLevel',
          });
        }

        const validChains = ['ethereum', 'base', 'bnb', 'solana'];
        if (!validChains.includes(chain)) {
          return reply.code(400).send({
            error: 'Invalid chain. Must be one of: ethereum, base, bnb, solana',
          });
        }

        const validStrategies = [
          'trend_following',
          'breakout',
          'scalping',
          'momentum',
          'reversal',
          'whale_tracking',
          'sideways_accumulation',
        ];
        if (!validStrategies.includes(strategy)) {
          return reply.code(400).send({
            error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`,
          });
        }

        const validRiskLevels = ['low', 'medium', 'high'];
        if (!validRiskLevels.includes(riskLevel)) {
          return reply.code(400).send({
            error: 'Invalid riskLevel. Must be one of: low, medium, high',
          });
        }

        const input: BotCreateInput = {
          name,
          chain,
          tokenAddress,
          strategy: strategy as any,
          riskLevel,
          enableNotifications,
        };

        const bot = await botService.createBot(userId, input);

        await botRuntime.scheduleAllBots();

        logger.info(`Bot ${bot.id} created for user ${userId}`);

        return reply.code(201).send(bot);
      } catch (error) {
        logger.error('Error creating bot:', error);
        return reply.code(500).send({
          error: 'Failed to create bot',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get(
    '/bot/list',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;

        const bots = await botService.listBots(userId);

        return reply.code(200).send(bots);
      } catch (error) {
        logger.error('Error listing bots:', error);
        return reply.code(500).send({
          error: 'Failed to list bots',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get<{ Params: BotIdParams }>(
    '/bot/:id',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: BotIdParams }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;

        const bot = await botService.getBotById(id, userId);

        if (!bot) {
          return reply.code(404).send({
            error: 'Bot not found',
          });
        }

        return reply.code(200).send(bot);
      } catch (error) {
        logger.error('Error fetching bot:', error);
        return reply.code(500).send({
          error: 'Failed to fetch bot',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.patch<{ Params: BotIdParams; Body: BotUpdateBody }>(
    '/bot/:id',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: BotIdParams; Body: BotUpdateBody }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;
        const input: BotUpdateInput = request.body;

        const bot = await botService.updateBot(id, userId, input);

        await botRuntime.scheduleAllBots();

        return reply.code(200).send(bot);
      } catch (error) {
        logger.error('Error updating bot:', error);
        return reply.code(500).send({
          error: 'Failed to update bot',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.delete<{ Params: BotIdParams }>(
    '/bot/:id',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: BotIdParams }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;

        await botService.deleteBot(id, userId);

        await botRuntime.scheduleAllBots();

        return reply.code(200).send({
          message: 'Bot deleted successfully',
        });
      } catch (error) {
        logger.error('Error deleting bot:', error);
        return reply.code(500).send({
          error: 'Failed to delete bot',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get<{ Params: BotIdParams }>(
    '/bot/:id/signals',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: BotIdParams }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;

        const signals = await botService.getBotSignals(id, userId, 50);

        return reply.code(200).send(signals);
      } catch (error) {
        logger.error('Error fetching bot signals:', error);
        return reply.code(500).send({
          error: 'Failed to fetch bot signals',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.post<{ Params: BotIdParams }>(
    '/bot/:id/evaluate',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: BotIdParams }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;

        const bot = await botService.getBotById(id, userId);

        if (!bot) {
          return reply.code(404).send({
            error: 'Bot not found',
          });
        }

        await botRuntime.evaluateBotNow(id);

        return reply.code(200).send({
          message: 'Bot evaluation triggered',
        });
      } catch (error) {
        logger.error('Error triggering bot evaluation:', error);
        return reply.code(500).send({
          error: 'Failed to trigger bot evaluation',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get(
    '/bot/runtime/status',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const scheduledBots = botRuntime.getScheduledBots();

        return reply.code(200).send({
          status: 'running',
          scheduledBots: scheduledBots.length,
          bots: scheduledBots,
        });
      } catch (error) {
        logger.error('Error fetching runtime status:', error);
        return reply.code(500).send({
          error: 'Failed to fetch runtime status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
