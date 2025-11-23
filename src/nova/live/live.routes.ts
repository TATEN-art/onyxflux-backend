import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NovaLiveService } from './live.service';
import { authMiddleware } from '../../middlewares/auth';

const novaLiveService = new NovaLiveService();

interface SymbolParams {
  symbol: string;
}

export async function novaLiveRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/nova/live/prices',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const prices = novaLiveService.getLivePrices();
        return reply.status(200).send({ prices });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to get live prices',
        });
      }
    }
  );

  fastify.get(
    '/nova/live/candles/:symbol',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: SymbolParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { symbol } = request.params;
        const candles = novaLiveService.getCandles(symbol);
        return reply.status(200).send({ symbol, candles });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to get candles',
        });
      }
    }
  );

  fastify.get(
    '/nova/live/predictions/:symbol',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: SymbolParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { symbol } = request.params;
        const prediction = novaLiveService.getPredictions(symbol);
        return reply.status(200).send(prediction);
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to get predictions',
        });
      }
    }
  );

  fastify.get(
    '/nova/live/reasoning/:symbol',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: SymbolParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { symbol } = request.params;
        const reasoning = novaLiveService.getReasoning(symbol);
        return reply.status(200).send({ symbol, reasoning });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to get reasoning',
        });
      }
    }
  );
}
