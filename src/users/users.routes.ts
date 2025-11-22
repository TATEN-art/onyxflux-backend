import { FastifyInstance } from 'fastify';
import { UsersService } from './users.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const usersService = new UsersService();

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/users/stats', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const stats = await usersService.getUserStats(request.user!.userId);
      return reply.send({ stats });
    } catch (error) {
      console.error('Get user stats error:', error);
      return reply.status(500).send({ error: 'Failed to get user stats' });
    }
  });
}
