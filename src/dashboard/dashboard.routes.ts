import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DashboardService } from './dashboard.service';
import { authMiddleware } from '../middlewares/auth';

const dashboardService = new DashboardService();

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/user/dashboard',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const dashboardData = await dashboardService.getDashboardData(user.userId);

        return reply.status(200).send(dashboardData);
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to get dashboard data',
        });
      }
    }
  );
}
