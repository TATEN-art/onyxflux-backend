import { FastifyInstance } from 'fastify';
import { AnalyticsService } from './analytics.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

export async function analyticsRoutes(
  fastify: FastifyInstance,
  analyticsService: AnalyticsService
): Promise<void> {
  fastify.get('/metrics/system', async (_request, reply) => {
    try {
      const metrics = await analyticsService.getSystemMetrics();
      return reply.send({ metrics });
    } catch (error) {
      console.error('Get system metrics error:', error);
      return reply.status(500).send({ error: 'Failed to get system metrics' });
    }
  });

  fastify.get('/metrics/user', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const metrics = await analyticsService.getUserMetrics(request.user!.userId);
      return reply.send({ metrics });
    } catch (error) {
      console.error('Get user metrics error:', error);
      return reply.status(500).send({ error: 'Failed to get user metrics' });
    }
  });

  fastify.get('/metrics/usage', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const stats = await analyticsService.getUsageStats(request.user!.userId);
      return reply.send({ stats });
    } catch (error) {
      console.error('Get usage stats error:', error);
      return reply.status(500).send({ error: 'Failed to get usage stats' });
    }
  });

  fastify.get('/status', async (_request, reply) => {
    return reply.send({
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
}
