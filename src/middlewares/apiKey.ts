import { FastifyRequest, FastifyReply } from 'fastify';
import { compareApiKey } from '../utils/crypto';
import prisma from '../config/database';
import redis from '../config/redis';

export interface ApiKeyRequest extends FastifyRequest {
  apiKey?: {
    id: string;
    userId: string;
    plan: string;
  };
}

export async function apiKeyMiddleware(
  request: ApiKeyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return reply.status(401).send({ error: 'API key required' });
    }

    if (!apiKey.startsWith('ONYX-KEY-')) {
      return reply.status(401).send({ error: 'Invalid API key format' });
    }

    const cachedKeyData = await redis.get(`apikey:${apiKey}`);
    
    if (cachedKeyData) {
      const keyData = JSON.parse(cachedKeyData);
      request.apiKey = keyData;
      return;
    }

    const allKeys = await prisma.apiKey.findMany({
      where: { revokedAt: null },
      include: { user: true },
    });

    let matchedKey = null;
    for (const key of allKeys) {
      const isMatch = await compareApiKey(apiKey, key.keyHash);
      if (isMatch) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    await prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() },
    });

    const keyData = {
      id: matchedKey.id,
      userId: matchedKey.userId,
      plan: matchedKey.user.plan,
    };

    await redis.setex(`apikey:${apiKey}`, 3600, JSON.stringify(keyData));

    request.apiKey = keyData;
  } catch (error) {
    console.error('API key middleware error:', error);
    return reply.status(401).send({ error: 'Invalid API key' });
  }
}
