import { FastifyInstance } from 'fastify';
import { ApiKeysService } from './apiKeys.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const apiKeysService = new ApiKeysService();

export async function apiKeysRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api-keys', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { name } = request.body as { name?: string };
      const result = await apiKeysService.generateKey(request.user!.userId, name);

      return reply.send({
        message: 'API key generated successfully',
        key: result.key,
        prefix: result.prefix,
      });
    } catch (error) {
      console.error('Generate key error:', error);
      return reply.status(500).send({ error: 'Failed to generate API key' });
    }
  });

  fastify.get('/api-keys', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const keys = await apiKeysService.listKeys(request.user!.userId);
      return reply.send({ keys });
    } catch (error) {
      console.error('List keys error:', error);
      return reply.status(500).send({ error: 'Failed to list API keys' });
    }
  });

  fastify.delete('/api-keys/:keyId', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { keyId } = request.params as { keyId: string };
      await apiKeysService.revokeKey(request.user!.userId, keyId);

      return reply.send({ message: 'API key revoked successfully' });
    } catch (error) {
      console.error('Revoke key error:', error);
      return reply.status(500).send({ error: 'Failed to revoke API key' });
    }
  });

  fastify.post('/api-keys/:keyId/rotate', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { keyId } = request.params as { keyId: string };
      const result = await apiKeysService.rotateKey(request.user!.userId, keyId);

      return reply.send({
        message: 'API key rotated successfully',
        key: result.key,
        prefix: result.prefix,
      });
    } catch (error) {
      console.error('Rotate key error:', error);
      return reply.status(500).send({ error: 'Failed to rotate API key' });
    }
  });

  fastify.get('/api-keys/:keyId/usage', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { keyId } = request.params as { keyId: string };
      const stats = await apiKeysService.getUsageStats(request.user!.userId, keyId);

      return reply.send({ stats });
    } catch (error) {
      console.error('Get usage error:', error);
      return reply.status(500).send({ error: 'Failed to get usage stats' });
    }
  });
}
