import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../utils/logger';
import { BotService } from './bot.service';
import { CreateBotRequest, UpdateBotRequest } from './bot.model';
import { requireBotBuilder } from '../middlewares/planLimits';
import { auditMiddleware } from '../middlewares/security';

const logger = new Logger('BotController');

export async function botRoutes(fastify: FastifyInstance) {
  const botService = new BotService();
  
  /**
   * POST /api/bot/create
   * Create a new bot
   */
  fastify.post('/api/bot/create', {
    preHandler: [fastify.authenticate, requireBotBuilder, auditMiddleware('create', 'bot')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const body = request.body as CreateBotRequest;
      
      if (!body.token || !body.chain) {
        return reply.code(400).send({
          error: 'Missing required fields: token, chain',
        });
      }
      
      const bot = await botService.createBot(userId, body);
      
      return reply.code(201).send({
        success: true,
        bot,
      });
    } catch (error: any) {
      logger.error('Error creating bot:', error);
      
      if (error.message.includes('limit reached')) {
        return reply.code(403).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to create bot',
        message: error.message,
      });
    }
  });
  
  /**
   * POST /api/bot/update
   * Update bot configuration
   */
  fastify.post('/api/bot/update', {
    preHandler: [fastify.authenticate, requireBotBuilder, auditMiddleware('update', 'bot')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const body = request.body as { botId: string } & UpdateBotRequest;
      
      if (!body.botId) {
        return reply.code(400).send({
          error: 'Missing required field: botId',
        });
      }
      
      const bot = await botService.updateBot(userId, body.botId, body);
      
      return reply.send({
        success: true,
        bot,
      });
    } catch (error: any) {
      logger.error('Error updating bot:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to update bot',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/bot/list
   * List all bots for user
   */
  fastify.get('/api/bot/list', {
    preHandler: [fastify.authenticate, requireBotBuilder],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      
      const bots = await botService.listBots(userId);
      
      return reply.send({
        success: true,
        count: bots.length,
        bots,
      });
    } catch (error: any) {
      logger.error('Error listing bots:', error);
      
      return reply.code(500).send({
        error: 'Failed to list bots',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/bot/:id
   * Get bot by ID
   */
  fastify.get('/api/bot/:id', {
    preHandler: [fastify.authenticate, requireBotBuilder],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      const bot = await botService.getBotWithSignals(userId, id);
      
      return reply.send({
        success: true,
        bot,
      });
    } catch (error: any) {
      logger.error('Error fetching bot:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to fetch bot',
        message: error.message,
      });
    }
  });
  
  /**
   * DELETE /api/bot/:id
   * Delete bot
   */
  fastify.delete('/api/bot/:id', {
    preHandler: [fastify.authenticate, requireBotBuilder, auditMiddleware('delete', 'bot')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      await botService.deleteBot(userId, id);
      
      return reply.send({
        success: true,
        message: 'Bot deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting bot:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to delete bot',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/bot/:id/suggestions
   * Get strategy suggestions for bot
   */
  fastify.get('/api/bot/:id/suggestions', {
    preHandler: [fastify.authenticate, requireBotBuilder],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      return reply.send({
        success: true,
        message: 'Strategy suggestions require real-time market data',
        note: 'This endpoint will be fully functional once integrated with live data feeds',
      });
    } catch (error: any) {
      logger.error('Error generating suggestions:', error);
      
      return reply.code(500).send({
        error: 'Failed to generate suggestions',
        message: error.message,
      });
    }
  });
  
  logger.info('Bot routes registered');
}
