import { FastifyInstance } from 'fastify';
import { PredictionService } from './prediction/prediction.service';
import { WhalesService } from './whales/whales.service';
import { LiquidityService } from './liquidity/liquidity.service';
import { ManipulationService } from './manipulation/manipulation.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { UsersService } from '../users/users.service';
import { NOVA_CREDIT_COSTS } from '../config/plans';

const predictionService = new PredictionService();
const usersService = new UsersService();

export async function novaRoutes(
  fastify: FastifyInstance,
  whalesService: WhalesService,
  liquidityService: LiquidityService,
  manipulationService: ManipulationService
): Promise<void> {
  fastify.post('/nova/predict', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { tokenAddress, chain, historicalData } = request.body as {
        tokenAddress: string;
        chain: string;
        historicalData: Array<{ timestamp: number; price: number; volume: number }>;
      };

      const canDeduct = await usersService.deductNovaCredits(
        request.user!.userId,
        NOVA_CREDIT_COSTS.PREDICTION
      );

      if (!canDeduct) {
        return reply.status(402).send({ error: 'Insufficient Nova credits' });
      }

      const prediction = await predictionService.predictPrice(tokenAddress, chain, historicalData);

      return reply.send({ prediction });
    } catch (error) {
      console.error('Nova prediction error:', error);
      return reply.status(500).send({ error: 'Prediction failed' });
    }
  });

  fastify.get('/nova/whales/recent', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { limit } = request.query as { limit?: string };
      
      const canDeduct = await usersService.deductNovaCredits(
        request.user!.userId,
        NOVA_CREDIT_COSTS.WHALE_SCAN
      );

      if (!canDeduct) {
        return reply.status(402).send({ error: 'Insufficient Nova credits' });
      }

      const whales = await whalesService.getRecentWhaleActivity(
        limit ? parseInt(limit) : 50
      );

      return reply.send({ whales });
    } catch (error) {
      console.error('Get whales error:', error);
      return reply.status(500).send({ error: 'Failed to get whale activity' });
    }
  });

  fastify.get('/nova/whales/:chain/:token', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { chain, token } = request.params as { chain: string; token: string };
      const { limit } = request.query as { limit?: string };

      const canDeduct = await usersService.deductNovaCredits(
        request.user!.userId,
        NOVA_CREDIT_COSTS.WHALE_SCAN
      );

      if (!canDeduct) {
        return reply.status(402).send({ error: 'Insufficient Nova credits' });
      }

      const whales = await whalesService.getWhaleActivityByToken(
        chain,
        token,
        limit ? parseInt(limit) : 50
      );

      return reply.send({ whales });
    } catch (error) {
      console.error('Get token whales error:', error);
      return reply.status(500).send({ error: 'Failed to get whale activity' });
    }
  });

  fastify.get('/nova/liquidity/:chain/:token', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { chain, token } = request.params as { chain: string; token: string };

      const canDeduct = await usersService.deductNovaCredits(
        request.user!.userId,
        NOVA_CREDIT_COSTS.LIQUIDITY_ANALYSIS
      );

      if (!canDeduct) {
        return reply.status(402).send({ error: 'Insufficient Nova credits' });
      }

      const liquidity = await liquidityService.getCurrentLiquidity(chain, token);

      return reply.send({ liquidity });
    } catch (error) {
      console.error('Get liquidity error:', error);
      return reply.status(500).send({ error: 'Failed to get liquidity data' });
    }
  });

  fastify.get('/nova/manipulation/recent', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { limit } = request.query as { limit?: string };

      const canDeduct = await usersService.deductNovaCredits(
        request.user!.userId,
        NOVA_CREDIT_COSTS.MANIPULATION_SCAN
      );

      if (!canDeduct) {
        return reply.status(402).send({ error: 'Insufficient Nova credits' });
      }

      const events = await manipulationService.getRecentManipulationEvents(
        limit ? parseInt(limit) : 50
      );

      return reply.send({ events });
    } catch (error) {
      console.error('Get manipulation events error:', error);
      return reply.status(500).send({ error: 'Failed to get manipulation events' });
    }
  });

  fastify.post('/nova/monitor/whale', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { chain, tokenAddress } = request.body as { chain: string; tokenAddress: string };

      whalesService.addTokenToMonitor(chain, tokenAddress);

      return reply.send({ message: 'Token added to whale monitoring' });
    } catch (error) {
      console.error('Add whale monitor error:', error);
      return reply.status(500).send({ error: 'Failed to add token to monitoring' });
    }
  });

  fastify.post('/nova/monitor/liquidity', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { chain, poolAddress } = request.body as { chain: string; poolAddress: string };

      liquidityService.addPoolToMonitor(chain, poolAddress);

      return reply.send({ message: 'Pool added to liquidity monitoring' });
    } catch (error) {
      console.error('Add liquidity monitor error:', error);
      return reply.status(500).send({ error: 'Failed to add pool to monitoring' });
    }
  });

  fastify.post('/nova/monitor/manipulation', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { chain, tokenAddress } = request.body as { chain: string; tokenAddress: string };

      manipulationService.addTokenToMonitor(chain, tokenAddress);

      return reply.send({ message: 'Token added to manipulation monitoring' });
    } catch (error) {
      console.error('Add manipulation monitor error:', error);
      return reply.status(500).send({ error: 'Failed to add token to monitoring' });
    }
  });
}
