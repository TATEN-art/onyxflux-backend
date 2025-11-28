import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middlewares/auth';
import { tokenService } from './token.service';
import { TokenCreateInput } from './types';
import { logger } from '../utils/logger';

interface TokenCreateBody {
  blockchain: 'ethereum' | 'base' | 'bnb' | 'solana';
  name: string;
  symbol: string;
  totalSupply: number;
  decimals: number;
  features: {
    mintable: boolean;
    burnable: boolean;
    liquidityTax: number;
    marketingTax: number;
    antiWhale: boolean;
    antiBot: boolean;
  };
  uploadLogo?: string;
  verifyOnExplorer: boolean;
  destinationWallet: string;
}

interface TokenIdParams {
  id: string;
}

interface TokenDeployBody {
  txHash: string;
  contractAddress: string;
}

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 30000; // 30 seconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(userId);

  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    return false;
  }

  rateLimitMap.set(userId, now);
  return true;
}

export async function tokenRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: TokenCreateBody }>(
    '/token/create',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: TokenCreateBody }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const userPlan = (request as any).user.plan || 'free';

        if (!checkRateLimit(userId)) {
          return reply.code(429).send({
            error: 'Rate limit exceeded. Please wait 30 seconds before creating another token.',
          });
        }

        const {
          blockchain,
          name,
          symbol,
          totalSupply,
          decimals,
          features,
          uploadLogo,
          verifyOnExplorer,
          destinationWallet,
        } = request.body;

        if (!blockchain || !name || !symbol || !totalSupply || !decimals || !destinationWallet) {
          return reply.code(400).send({
            error: 'Missing required fields: blockchain, name, symbol, totalSupply, decimals, destinationWallet',
          });
        }

        const validBlockchains = ['ethereum', 'base', 'bnb', 'solana'];
        if (!validBlockchains.includes(blockchain)) {
          return reply.code(400).send({
            error: 'Invalid blockchain. Must be one of: ethereum, base, bnb, solana',
          });
        }

        if (userPlan === 'free') {
          return reply.code(403).send({
            error: 'Token generator is not available for free plan. Upgrade to Pro or Enterprise.',
          });
        }

        if (!features) {
          return reply.code(400).send({
            error: 'Missing required field: features',
          });
        }

        const input: TokenCreateInput = {
          blockchain,
          name,
          symbol,
          totalSupply,
          decimals: decimals || (blockchain === 'solana' ? 9 : 18),
          features,
          uploadLogo,
          verifyOnExplorer: verifyOnExplorer || false,
          destinationWallet,
        };

        const result = await tokenService.createToken(userId, userPlan, input);

        logger.info(`Token created for user ${userId}: ${result.tokenId}`);

        return reply.code(201).send(result);
      } catch (error) {
        logger.error('Error creating token:', error);
        return reply.code(500).send({
          error: 'Failed to create token',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get(
    '/token/list',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;

        const tokens = await tokenService.listTokens(userId);

        return reply.code(200).send(tokens);
      } catch (error) {
        logger.error('Error listing tokens:', error);
        return reply.code(500).send({
          error: 'Failed to list tokens',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get<{ Params: TokenIdParams }>(
    '/token/:id',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: TokenIdParams }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;

        const token = await tokenService.getTokenById(id, userId);

        if (!token) {
          return reply.code(404).send({
            error: 'Token not found',
          });
        }

        return reply.code(200).send(token);
      } catch (error) {
        logger.error('Error fetching token:', error);
        return reply.code(500).send({
          error: 'Failed to fetch token',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.post<{ Params: TokenIdParams; Body: TokenDeployBody }>(
    '/token/:id/deploy',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: TokenIdParams; Body: TokenDeployBody }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;
        const { txHash, contractAddress } = request.body;

        if (!txHash || !contractAddress) {
          return reply.code(400).send({
            error: 'Missing required fields: txHash, contractAddress',
          });
        }

        await tokenService.updateDeployment(id, userId, txHash, contractAddress);

        return reply.code(200).send({
          message: 'Token deployment updated successfully',
        });
      } catch (error) {
        logger.error('Error updating token deployment:', error);
        return reply.code(500).send({
          error: 'Failed to update token deployment',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.post<{ Params: TokenIdParams }>(
    '/token/:id/verify',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: TokenIdParams }>, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.id;
        const { id } = request.params;

        await tokenService.verifyToken(id, userId);

        return reply.code(200).send({
          message: 'Token verification initiated successfully',
        });
      } catch (error) {
        logger.error('Error verifying token:', error);
        return reply.code(500).send({
          error: 'Failed to verify token',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get(
    '/token/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.code(200).send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        supportedChains: ['ethereum', 'base', 'bnb', 'solana'],
      });
    }
  );
}
