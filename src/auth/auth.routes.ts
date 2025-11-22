import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const authService = new AuthService();

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/auth/send-code', async (request, reply) => {
    try {
      const { email } = request.body as { email: string };

      if (!email || !email.includes('@')) {
        return reply.status(400).send({ error: 'Valid email required' });
      }

      await authService.sendVerificationCode(email);

      return reply.send({ message: 'Verification code sent' });
    } catch (error) {
      console.error('Send code error:', error);
      return reply.status(500).send({ error: 'Failed to send verification code' });
    }
  });

  fastify.post('/auth/verify-code', async (request, reply) => {
    try {
      const { email, code } = request.body as { email: string; code: string };

      if (!email || !code) {
        return reply.status(400).send({ error: 'Email and code required' });
      }

      const token = await authService.verifyCode(email, code);

      return reply.send({ token });
    } catch (error) {
      console.error('Verify code error:', error);
      return reply.status(401).send({ error: 'Invalid or expired code' });
    }
  });

  fastify.get('/auth/me', {
    preHandler: authMiddleware,
  }, async (request: AuthenticatedRequest, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
        select: {
          id: true,
          email: true,
          plan: true,
          trialStart: true,
          trialEnd: true,
          novaCreditsLeft: true,
          apiRequestCount: true,
          novaRequestCount: true,
          createdAt: true,
        },
      });

      return reply.send({ user });
    } catch (error) {
      console.error('Get user error:', error);
      return reply.status(500).send({ error: 'Failed to get user' });
    }
  });
}

import prisma from '../config/database';
