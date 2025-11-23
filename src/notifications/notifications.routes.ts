import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotificationsService, NotificationSettings } from './notifications.service';
import { authMiddleware } from '../middlewares/auth';

const notificationsService = new NotificationsService();

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/notifications/list',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const notifications = await notificationsService.listNotifications(user.userId);

        return reply.status(200).send({ notifications });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to list notifications',
        });
      }
    }
  );

  fastify.post(
    '/notifications/test',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const result = await notificationsService.sendTestNotification(user.userId);

        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to send test notification',
        });
      }
    }
  );

  fastify.post(
    '/notifications/settings',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Body: NotificationSettings }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        const settings = request.body;

        const result = await notificationsService.saveSettings(user.userId, settings);

        return reply.status(200).send({ settings: result });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to save notification settings',
        });
      }
    }
  );

  fastify.get(
    '/notifications/settings',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const settings = await notificationsService.getSettings(user.userId);

        return reply.status(200).send({ settings });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to get notification settings',
        });
      }
    }
  );
}
