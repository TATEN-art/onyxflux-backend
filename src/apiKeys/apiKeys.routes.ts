import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth';
import { createApiKey, listApiKeys, revokeApiKey, deleteApiKey } from './apiKeys.service';
import { AppError } from '../utils/errorHandler';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['standard', 'nova']).default('standard'),
});

const revokeApiKeySchema = z.object({
  keyId: z.string(),
});

export async function apiKeyRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { name, type } = createApiKeySchema.parse(request.body);
      const userId = request.user!.id;

      const apiKey = await createApiKey(userId, name, type);

      return reply.send({
        success: true,
        data: apiKey,
        message: 'API key created successfully. Save this key securely, it will not be shown again.',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'Failed to create API key');
    }
  });

  fastify.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const apiKeys = await listApiKeys(userId);

      return reply.send({
        success: true,
        data: apiKeys,
      });
    } catch (error) {
      throw new AppError(400, 'Failed to list API keys');
    }
  });

  fastify.post('/revoke', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { keyId } = revokeApiKeySchema.parse(request.body);
      const userId = request.user!.id;

      await revokeApiKey(userId, keyId);

      return reply.send({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'Failed to revoke API key');
    }
  });

  fastify.delete('/:keyId', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { keyId } = request.params as { keyId: string };
      const userId = request.user!.id;

      await deleteApiKey(userId, keyId);

      return reply.send({
        success: true,
        message: 'API key deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'Failed to delete API key');
    }
  });
}
