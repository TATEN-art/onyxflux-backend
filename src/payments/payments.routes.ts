import { FastifyInstance } from 'fastify';
import { PaymentsService } from './payments.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { config } from '../config/env';

const paymentsService = new PaymentsService();

export async function paymentsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/payments/info', async (_request, reply) => {
    return reply.send({
      walletAddress: config.payment.walletAddress,
      acceptedTokens: ['USDT', 'USDC'],
      acceptedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
      plans: {
        starter: { price: config.pricing.starter, currency: 'USD' },
        pro: { price: config.pricing.pro, currency: 'USD' },
        enterprise: { price: config.pricing.enterprise, currency: 'USD' },
      },
    });
  });

  fastify.get('/payments/history', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const history = await paymentsService.getPaymentHistory(request.user!.userId);
      return reply.send({ payments: history });
    } catch (error) {
      console.error('Get payment history error:', error);
      return reply.status(500).send({ error: 'Failed to get payment history' });
    }
  });

  fastify.post('/payments/confirm', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const { txHash } = request.body as { txHash: string };

      if (!txHash) {
        return reply.status(400).send({ error: 'Transaction hash required' });
      }

      await paymentsService.confirmPayment(txHash, request.user!.userId);

      return reply.send({ message: 'Payment confirmed successfully' });
    } catch (error) {
      console.error('Confirm payment error:', error);
      return reply.status(500).send({ error: 'Failed to confirm payment' });
    }
  });
}
