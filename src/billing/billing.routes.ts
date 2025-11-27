import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/auth';
import { confirmPayment, getPaymentHistory } from './billing.service';
import { AppError } from '../utils/errorHandler';

const confirmPaymentSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'base', 'arbitrum', 'optimism']),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  plan: z.enum(['pro', 'enterprise']),
  token: z.string().default('USDC'),
});

export async function billingRoutes(fastify: FastifyInstance) {
  fastify.post('/confirm', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const { chain, txHash, plan, token } = confirmPaymentSchema.parse(request.body);
      const userId = request.user!.id;

      const result = await confirmPayment(userId, chain, txHash, plan, token);

      return reply.send({
        success: true,
        data: result,
        message: 'Payment confirmed and plan upgraded successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'Failed to confirm payment');
    }
  });

  fastify.get('/payments', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const payments = await getPaymentHistory(userId);

      return reply.send({
        success: true,
        data: payments,
      });
    } catch (error) {
      throw new AppError(400, 'Failed to get payment history');
    }
  });
}
