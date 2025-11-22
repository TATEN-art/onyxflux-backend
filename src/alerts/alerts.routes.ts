import { FastifyInstance } from 'fastify';
import { AlertsService } from './alerts.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const alertsService = new AlertsService();

export async function alertsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/alerts', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { limit } = request.query as { limit?: string };
      
      const alerts = await alertsService.getUserAlerts(
        request.user!.userId,
        limit ? parseInt(limit) : 50
      );

      return reply.send({ alerts });
    } catch (error) {
      console.error('Get alerts error:', error);
      return reply.status(500).send({ error: 'Failed to get alerts' });
    }
  });

  fastify.get('/alerts/unread-count', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const count = await alertsService.getUnreadCount(request.user!.userId);
      return reply.send({ count });
    } catch (error) {
      console.error('Get unread count error:', error);
      return reply.status(500).send({ error: 'Failed to get unread count' });
    }
  });

  fastify.post('/alerts/:alertId/read', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { alertId } = request.params as { alertId: string };
      
      await alertsService.markAlertAsRead(request.user!.userId, alertId);

      return reply.send({ message: 'Alert marked as read' });
    } catch (error) {
      console.error('Mark alert as read error:', error);
      return reply.status(500).send({ error: 'Failed to mark alert as read' });
    }
  });

  fastify.post('/alerts/read-all', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      await alertsService.markAllAlertsAsRead(request.user!.userId);

      return reply.send({ message: 'All alerts marked as read' });
    } catch (error) {
      console.error('Mark all alerts as read error:', error);
      return reply.status(500).send({ error: 'Failed to mark all alerts as read' });
    }
  });
}
