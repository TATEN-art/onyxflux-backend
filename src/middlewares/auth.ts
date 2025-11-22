import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/database';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
    plan: string;
  };
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized: User not found' });
    }

    request.user = {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    };
  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
}
