import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../utils/logger';
import { StrategiesService, CreateStrategyRequest } from './strategies.service';

const logger = new Logger('StrategiesRoutes');

export async function strategiesRoutes(fastify: FastifyInstance) {
  const strategiesService = new StrategiesService();
  
  /**
   * POST /api/strategies/create
   * Create a new strategy
   */
  fastify.post('/api/strategies/create', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const body = request.body as CreateStrategyRequest;
      
      if (!body.name || !body.strategyType || !body.timeframe || !body.riskLevel) {
        return reply.code(400).send({
          error: 'Missing required fields: name, strategyType, timeframe, riskLevel',
        });
      }
      
      const strategy = await strategiesService.createStrategy(userId, body);
      
      return reply.code(201).send({
        success: true,
        strategy,
      });
    } catch (error: any) {
      logger.error('Error creating strategy:', error);
      
      if (error.message.includes('limit reached')) {
        return reply.code(403).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to create strategy',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/strategies/popular
   * Get popular strategies
   */
  fastify.get('/api/strategies/popular', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit } = request.query as { limit?: string };
      
      const strategies = await strategiesService.getPopularStrategies(
        limit ? parseInt(limit) : 20
      );
      
      return reply.send({
        success: true,
        count: strategies.length,
        strategies,
      });
    } catch (error: any) {
      logger.error('Error fetching popular strategies:', error);
      
      return reply.code(500).send({
        error: 'Failed to fetch popular strategies',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/strategies/top
   * Get top performing strategies
   */
  fastify.get('/api/strategies/top', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit } = request.query as { limit?: string };
      
      const strategies = await strategiesService.getTopStrategies(
        limit ? parseInt(limit) : 20
      );
      
      return reply.send({
        success: true,
        count: strategies.length,
        strategies,
      });
    } catch (error: any) {
      logger.error('Error fetching top strategies:', error);
      
      return reply.code(500).send({
        error: 'Failed to fetch top strategies',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/strategies/verified
   * Get Nova-verified strategies
   */
  fastify.get('/api/strategies/verified', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit } = request.query as { limit?: string };
      
      const strategies = await strategiesService.getNovaVerifiedStrategies(
        limit ? parseInt(limit) : 20
      );
      
      return reply.send({
        success: true,
        count: strategies.length,
        strategies,
      });
    } catch (error: any) {
      logger.error('Error fetching verified strategies:', error);
      
      return reply.code(500).send({
        error: 'Failed to fetch verified strategies',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/strategies/my
   * Get user's strategies
   */
  fastify.get('/api/strategies/my', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      
      const strategies = await strategiesService.getUserStrategies(userId);
      
      return reply.send({
        success: true,
        count: strategies.length,
        strategies,
      });
    } catch (error: any) {
      logger.error('Error fetching user strategies:', error);
      
      return reply.code(500).send({
        error: 'Failed to fetch user strategies',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/strategies/:id
   * Get strategy by ID
   */
  fastify.get('/api/strategies/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const viewerId = (request as any).user?.userId;
      
      const strategy = await strategiesService.getStrategy(id, viewerId);
      
      return reply.send({
        success: true,
        strategy,
      });
    } catch (error: any) {
      logger.error('Error fetching strategy:', error);
      
      if (error.message.includes('not found') || error.message.includes('private')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to fetch strategy',
        message: error.message,
      });
    }
  });
  
  /**
   * PUT /api/strategies/:id
   * Update strategy
   */
  fastify.put('/api/strategies/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      const updates = request.body as Partial<CreateStrategyRequest>;
      
      const strategy = await strategiesService.updateStrategy(userId, id, updates);
      
      return reply.send({
        success: true,
        strategy,
      });
    } catch (error: any) {
      logger.error('Error updating strategy:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to update strategy',
        message: error.message,
      });
    }
  });
  
  /**
   * DELETE /api/strategies/:id
   * Delete strategy
   */
  fastify.delete('/api/strategies/:id', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      await strategiesService.deleteStrategy(userId, id);
      
      return reply.send({
        success: true,
        message: 'Strategy deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting strategy:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to delete strategy',
        message: error.message,
      });
    }
  });
  
  /**
   * POST /api/strategies/:id/like
   * Like/unlike a strategy
   */
  fastify.post('/api/strategies/:id/like', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      await strategiesService.likeStrategy(userId, id);
      
      return reply.send({
        success: true,
        message: 'Strategy like toggled',
      });
    } catch (error: any) {
      logger.error('Error liking strategy:', error);
      
      return reply.code(500).send({
        error: 'Failed to like strategy',
        message: error.message,
      });
    }
  });
  
  /**
   * POST /api/strategies/:id/copy
   * Copy a strategy
   */
  fastify.post('/api/strategies/:id/copy', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      const copy = await strategiesService.copyStrategy(userId, id);
      
      return reply.send({
        success: true,
        strategy: copy,
      });
    } catch (error: any) {
      logger.error('Error copying strategy:', error);
      
      if (error.message.includes('not found') || error.message.includes('not accessible')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to copy strategy',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/strategies/search
   * Search strategies
   */
  fastify.get('/api/strategies/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { q, strategyType, timeframe, riskLevel, tags } = request.query as {
        q: string;
        strategyType?: string;
        timeframe?: string;
        riskLevel?: string;
        tags?: string;
      };
      
      if (!q) {
        return reply.code(400).send({
          error: 'Search query (q) is required',
        });
      }
      
      const filters = {
        strategyType,
        timeframe,
        riskLevel,
        tags: tags ? tags.split(',') : undefined,
      };
      
      const strategies = await strategiesService.searchStrategies(q, filters);
      
      return reply.send({
        success: true,
        count: strategies.length,
        strategies,
      });
    } catch (error: any) {
      logger.error('Error searching strategies:', error);
      
      return reply.code(500).send({
        error: 'Failed to search strategies',
        message: error.message,
      });
    }
  });
  
  logger.info('Strategies routes registered');
}
