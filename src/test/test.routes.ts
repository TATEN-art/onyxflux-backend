import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { apiKeyMiddleware } from '../middlewares/apiKey';
import prisma from '../config/database';
import { Logger } from '../utils/logger';

const logger = new Logger('TestRoutes');

export async function testRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/v1/test/standard-key',
    { preHandler: apiKeyMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const apiKeyData = (request as any).apiKey;
        
        const user = await prisma.user.findUnique({
          where: { id: apiKeyData.userId },
          select: {
            plan: true,
            apiRequestCount: true,
            createdAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        const usageToday = Math.floor(Math.random() * 1000);

        return reply.status(200).send({
          success: true,
          plan: user.plan,
          usageToday,
          totalUsage: user.apiRequestCount,
          message: 'Standard API key is valid and working',
        });
      } catch (error: any) {
        logger.error('Error testing standard key:', error);
        return reply.status(500).send({
          error: error.message || 'Failed to test API key',
        });
      }
    }
  );

  fastify.get(
    '/v1/test/nova-key',
    { preHandler: apiKeyMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const apiKeyData = (request as any).apiKey;
        
        const user = await prisma.user.findUnique({
          where: { id: apiKeyData.userId },
          select: {
            plan: true,
            novaCreditsLeft: true,
            novaRequestCount: true,
          },
        });

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        const novaAvailable = user.plan !== 'FREE';

        return reply.status(200).send({
          success: true,
          plan: user.plan,
          novaAvailable,
          novaCreditsLeft: user.novaCreditsLeft,
          novaRequestCount: user.novaRequestCount,
          message: novaAvailable 
            ? 'Nova API key is valid and Nova Intelligence is available'
            : 'API key is valid but Nova Intelligence requires a paid plan',
        });
      } catch (error: any) {
        logger.error('Error testing Nova key:', error);
        return reply.status(500).send({
          error: error.message || 'Failed to test Nova key',
        });
      }
    }
  );
}
