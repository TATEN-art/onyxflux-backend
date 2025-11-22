import { FastifyInstance } from 'fastify';
import { WebhooksService } from './webhooks.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const webhooksService = new WebhooksService();

export async function webhooksRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/webhooks', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { url, events } = request.body as { url: string; events: string[] };

      if (!url || !events || events.length === 0) {
        return reply.status(400).send({ error: 'URL and events required' });
      }

      const webhook = await webhooksService.createWebhook(request.user!.userId, url, events);

      return reply.send({
        message: 'Webhook created successfully',
        webhook,
      });
    } catch (error) {
      console.error('Create webhook error:', error);
      return reply.status(500).send({ error: 'Failed to create webhook' });
    }
  });

  fastify.get('/webhooks', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const webhooks = await webhooksService.listWebhooks(request.user!.userId);
      return reply.send({ webhooks });
    } catch (error) {
      console.error('List webhooks error:', error);
      return reply.status(500).send({ error: 'Failed to list webhooks' });
    }
  });

  fastify.delete('/webhooks/:webhookId', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { webhookId } = request.params as { webhookId: string };
      
      await webhooksService.deleteWebhook(request.user!.userId, webhookId);

      return reply.send({ message: 'Webhook deleted successfully' });
    } catch (error) {
      console.error('Delete webhook error:', error);
      return reply.status(500).send({ error: 'Failed to delete webhook' });
    }
  });

  fastify.patch('/webhooks/:webhookId', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { webhookId } = request.params as { webhookId: string };
      const { active } = request.body as { active: boolean };

      await webhooksService.toggleWebhook(request.user!.userId, webhookId, active);

      return reply.send({ message: 'Webhook updated successfully' });
    } catch (error) {
      console.error('Update webhook error:', error);
      return reply.status(500).send({ error: 'Failed to update webhook' });
    }
  });

  fastify.get('/webhooks/:webhookId/deliveries', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { webhookId } = request.params as { webhookId: string };
      const { limit } = request.query as { limit?: string };

      const deliveries = await webhooksService.getWebhookDeliveries(
        request.user!.userId,
        webhookId,
        limit ? parseInt(limit) : 50
      );

      return reply.send({ deliveries });
    } catch (error) {
      console.error('Get webhook deliveries error:', error);
      return reply.status(500).send({ error: 'Failed to get webhook deliveries' });
    }
  });
}
