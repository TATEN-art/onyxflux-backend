import { FastifyInstance } from 'fastify';
import { ChainsService } from './chains.service';
import { apiKeyMiddleware, ApiKeyRequest } from '../middlewares/apiKey';
import { rateLimitMiddleware } from '../middlewares/rateLimit';
import { trackUsage } from '../middlewares/usage';

const chainsService = new ChainsService();

export async function chainsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/v1/chains', async (_request, reply) => {
    const chains = chainsService.getSupportedChains();
    return reply.send({ chains });
  });

  fastify.get('/v1/chains/status', async (_request, reply) => {
    const status = await chainsService.getAllChainsStatus();
    return reply.send({ status });
  });

  fastify.get('/v1/rpc/:chain', {
    preHandler: [apiKeyMiddleware, rateLimitMiddleware, trackUsage],
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { chain } = request.params as { chain: string };
      const { method, params } = request.query as { method: string; params?: string };

      if (!method) {
        return reply.status(400).send({ error: 'Method parameter required' });
      }

      const parsedParams = params ? JSON.parse(params) : [];
      const result = await chainsService.executeRpcCall(chain, method, parsedParams);

      return reply.send({ result });
    } catch (error) {
      console.error('RPC GET error:', error);
      return reply.status(500).send({ error: 'RPC call failed' });
    }
  });

  fastify.post('/v1/rpc/:chain', {
    preHandler: [apiKeyMiddleware, rateLimitMiddleware, trackUsage],
  }, async (request: ApiKeyRequest, reply) => {
    try {
      const { chain } = request.params as { chain: string };
      const { method, params } = request.body as { method: string; params?: unknown[] };

      if (!method) {
        return reply.status(400).send({ error: 'Method required in body' });
      }

      const result = await chainsService.executeRpcCall(chain, method, params || []);

      return reply.send({ result });
    } catch (error) {
      console.error('RPC POST error:', error);
      return reply.status(500).send({ error: 'RPC call failed' });
    }
  });
}
