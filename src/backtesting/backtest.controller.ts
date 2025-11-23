import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../utils/logger';
import { BacktestService } from './backtest.service';
import { BacktestConfig } from './backtest.engine';
import { requireBacktesting } from '../middlewares/planLimits';
import { auditMiddleware } from '../middlewares/security';

const logger = new Logger('BacktestController');

export async function backtestRoutes(fastify: FastifyInstance) {
  const backtestService = new BacktestService();
  
  /**
   * POST /api/backtest/run
   * Run a new backtest
   */
  fastify.post('/api/backtest/run', {
    preHandler: [fastify.authenticate, requireBacktesting, auditMiddleware('run', 'backtest')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const config = request.body as BacktestConfig;
      
      if (!config.token || !config.chain || !config.strategy || !config.timeframe) {
        return reply.code(400).send({
          error: 'Missing required fields: token, chain, strategy, timeframe',
        });
      }
      
      if (!config.startDate || !config.endDate) {
        return reply.code(400).send({
          error: 'Missing required fields: startDate, endDate',
        });
      }
      
      if (config.startDate >= config.endDate) {
        return reply.code(400).send({
          error: 'startDate must be before endDate',
        });
      }
      
      if (!config.initialCapital || config.initialCapital <= 0) {
        return reply.code(400).send({
          error: 'initialCapital must be greater than 0',
        });
      }
      
      const result = await backtestService.runBacktest(userId, config);
      
      return reply.send({
        success: true,
        backtest: result,
      });
    } catch (error: any) {
      logger.error('Error running backtest:', error);
      
      if (error.message.includes('limit reached')) {
        return reply.code(403).send({
          error: error.message,
        });
      }
      
      if (error.message.includes('Insufficient data')) {
        return reply.code(400).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to run backtest',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/backtest/list
   * List user's backtests
   */
  fastify.get('/api/backtest/list', {
    preHandler: [fastify.authenticate, requireBacktesting],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { limit } = request.query as { limit?: string };
      
      const backtests = await backtestService.listBacktests(
        userId,
        limit ? parseInt(limit) : 20
      );
      
      return reply.send({
        success: true,
        count: backtests.length,
        backtests,
      });
    } catch (error: any) {
      logger.error('Error listing backtests:', error);
      
      return reply.code(500).send({
        error: 'Failed to list backtests',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/backtest/:id
   * Get backtest by ID
   */
  fastify.get('/api/backtest/:id', {
    preHandler: [fastify.authenticate, requireBacktesting],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      const backtest = await backtestService.getBacktest(userId, id);
      
      return reply.send({
        success: true,
        backtest,
      });
    } catch (error: any) {
      logger.error('Error fetching backtest:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to fetch backtest',
        message: error.message,
      });
    }
  });
  
  /**
   * DELETE /api/backtest/:id
   * Delete backtest
   */
  fastify.delete('/api/backtest/:id', {
    preHandler: [fastify.authenticate, requireBacktesting, auditMiddleware('delete', 'backtest')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id } = request.params as { id: string };
      
      await backtestService.deleteBacktest(userId, id);
      
      return reply.send({
        success: true,
        message: 'Backtest deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting backtest:', error);
      
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return reply.code(404).send({
          error: error.message,
        });
      }
      
      return reply.code(500).send({
        error: 'Failed to delete backtest',
        message: error.message,
      });
    }
  });
  
  /**
   * POST /api/backtest/compare
   * Compare multiple backtests
   */
  fastify.post('/api/backtest/compare', {
    preHandler: [fastify.authenticate, requireBacktesting],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { backtestIds } = request.body as { backtestIds: string[] };
      
      if (!backtestIds || !Array.isArray(backtestIds) || backtestIds.length < 2) {
        return reply.code(400).send({
          error: 'At least 2 backtest IDs required for comparison',
        });
      }
      
      const comparison = await backtestService.compareBacktests(userId, backtestIds);
      
      return reply.send({
        success: true,
        ...comparison,
      });
    } catch (error: any) {
      logger.error('Error comparing backtests:', error);
      
      return reply.code(500).send({
        error: 'Failed to compare backtests',
        message: error.message,
      });
    }
  });
  
  logger.info('Backtest routes registered');
}
