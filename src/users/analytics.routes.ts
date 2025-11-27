import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middlewares/auth';
import { getUserAnalytics } from './analytics.service';
import { AppError } from '../utils/errorHandler';

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const analytics = await getUserAnalytics(userId);

      return reply.send({
        success: true,
        data: analytics,
      });
    } catch (error) {
      throw new AppError(400, 'Failed to get analytics');
    }
  });
}
