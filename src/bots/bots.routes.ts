import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BotsService, CreateBotData } from './bots.service';
import { authMiddleware } from '../middlewares/auth';

const botsService = new BotsService();

interface BotIdParams {
  id: string;
}

export async function botsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/bots/list',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const bots = await botsService.listBots(user.userId);

        return reply.status(200).send({ bots });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to list bots',
        });
      }
    }
  );

  fastify.post(
    '/bots/create',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Body: Omit<CreateBotData, 'userId'> }>,
      reply: FastifyReply
    ) => {
      try {
        const user = (request as any).user;
        const { token, strategyType, riskLevel, timeframe, notificationsEnabled } = request.body;

        if (!token || !strategyType || !riskLevel || !timeframe) {
          return reply.status(400).send({
            error: 'Missing required fields: token, strategyType, riskLevel, timeframe',
          });
        }

        const bot = await botsService.createBot({
          userId: user.userId,
          token,
          strategyType,
          riskLevel,
          timeframe,
          notificationsEnabled,
        });

        return reply.status(201).send({ bot });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to create bot',
        });
      }
    }
  );

  fastify.get(
    '/bots/get/:id',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: BotIdParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const user = (request as any).user;

        const bot = await botsService.getBot(id, user.userId);

        return reply.status(200).send({ bot });
      } catch (error: any) {
        return reply.status(404).send({
          error: error.message || 'Bot not found',
        });
      }
    }
  );

  fastify.delete(
    '/bots/delete/:id',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: BotIdParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const user = (request as any).user;

        const result = await botsService.deleteBot(id, user.userId);

        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(404).send({
          error: error.message || 'Failed to delete bot',
        });
      }
    }
  );
}
