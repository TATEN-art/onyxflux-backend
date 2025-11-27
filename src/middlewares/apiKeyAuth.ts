import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { hashApiKey } from '../utils/crypto';

const prisma = new PrismaClient();

export async function apiKeyAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AppError(401, 'Missing API key');
    }

    const keyHash = hashApiKey(apiKey);

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKeyRecord) {
      throw new AppError(401, 'Invalid API key');
    }

    if (!apiKeyRecord.isActive) {
      throw new AppError(401, 'API key is inactive');
    }

    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    request.user = apiKeyRecord.user;
    request.apiKey = apiKeyRecord;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, 'API key authentication failed');
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: {
      id: string;
      userId: string;
      name: string;
      type: string;
    };
  }
}
