import { FastifyRequest, FastifyReply } from 'fastify';
import redis from '../config/redis';
import { PLAN_LIMITS } from '../config/plans';

export async function rateLimitMiddleware(
  request: FastifyRequest & { apiKey?: { userId: string; plan: string } },
  reply: FastifyReply
): Promise<void> {
  try {
    if (!request.apiKey) {
      return reply.status(401).send({ error: 'API key required' });
    }

    const { userId, plan } = request.apiKey;
    const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.rateLimit || 100;
    
    const key = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, 60);
    }

    if (current > limit) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        limit,
        reset: 60 - (Date.now() % 60000) / 1000,
      });
    }

    reply.header('X-RateLimit-Limit', limit.toString());
    reply.header('X-RateLimit-Remaining', (limit - current).toString());
  } catch (error) {
    console.error('Rate limit middleware error:', error);
  }
}
