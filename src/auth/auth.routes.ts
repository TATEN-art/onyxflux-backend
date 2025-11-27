import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyGoogleToken, createOrUpdateUser, createSession, deleteSession } from './auth.service';
import { authMiddleware } from '../middlewares/auth';
import { AppError } from '../utils/errorHandler';

const googleAuthSchema = z.object({
  idToken: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/google/verify', async (request, reply) => {
    try {
      const { idToken } = googleAuthSchema.parse(request.body);

      const googleData = await verifyGoogleToken(idToken);
      const { user, isNewUser } = await createOrUpdateUser(googleData);
      const session = await createSession(user.id);

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            planExpiry: user.planExpiry,
          },
          session: {
            token: session.token,
            expiresAt: session.expiresAt,
          },
          isNewUser,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(400, 'Authentication failed');
    }
  });

  fastify.post('/logout', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader?.substring(7);

      if (token) {
        await deleteSession(token);
      }

      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      throw new AppError(400, 'Logout failed');
    }
  });

  fastify.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
    return reply.send({
      success: true,
      data: {
        user: request.user,
      },
    });
  });
}
