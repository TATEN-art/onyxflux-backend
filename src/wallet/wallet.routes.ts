import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WalletService } from './wallet.service';
import { authMiddleware } from '../middlewares/auth';

const walletService = new WalletService();

interface ConnectWalletBody {
  userId: string;
  address: string;
  chain: string;
}

interface RemoveWalletParams {
  id: string;
}

export async function walletRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/wallet/connect',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Body: ConnectWalletBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { userId, address, chain } = request.body;

        if (!userId || !address || !chain) {
          return reply.status(400).send({
            error: 'Missing required fields: userId, address, chain',
          });
        }

        const result = await walletService.connectWallet(userId, address, chain);

        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to connect wallet',
        });
      }
    }
  );

  fastify.get(
    '/wallet/list',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const wallets = await walletService.listWallets(user.userId);

        return reply.status(200).send({ wallets });
      } catch (error: any) {
        return reply.status(500).send({
          error: error.message || 'Failed to list wallets',
        });
      }
    }
  );

  fastify.delete(
    '/wallet/remove/:id',
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: RemoveWalletParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const user = (request as any).user;

        const result = await walletService.removeWallet(id, user.userId);

        return reply.status(200).send(result);
      } catch (error: any) {
        return reply.status(404).send({
          error: error.message || 'Failed to remove wallet',
        });
      }
    }
  );
}
