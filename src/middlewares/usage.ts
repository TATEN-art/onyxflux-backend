import { FastifyRequest, FastifyReply } from 'fastify';
import redis from '../config/redis';
import prisma from '../config/database';

export async function trackUsage(
  request: FastifyRequest & { apiKey?: { id: string; userId: string } },
  reply: FastifyReply
): Promise<void> {
  if (!request.apiKey) {
    return;
  }

  const { userId } = request.apiKey;
  const key = `usage:${userId}:${new Date().toISOString().split('T')[0]}`;
  
  await redis.incr(key);
  await redis.expire(key, 86400 * 7);

  await prisma.user.update({
    where: { id: userId },
    data: { apiRequestCount: { increment: 1 } },
  });
}
