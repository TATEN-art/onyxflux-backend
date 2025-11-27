import { PrismaClient } from '@prisma/client';
import { generateApiKey } from '../utils/crypto';
import { AppError } from '../utils/errorHandler';

const prisma = new PrismaClient();

export async function createApiKey(userId: string, name: string, type: string = 'standard') {
  const { key, hash, prefix } = generateApiKey(type === 'nova' ? 'of_nova' : 'of');

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      type,
      isActive: true,
    },
  });

  return {
    id: apiKey.id,
    name: apiKey.name,
    key,
    prefix: apiKey.keyPrefix,
    type: apiKey.type,
    createdAt: apiKey.createdAt,
  };
}

export async function listApiKeys(userId: string) {
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      type: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return apiKeys;
}

export async function revokeApiKey(userId: string, keyId: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!apiKey) {
    throw new AppError(404, 'API key not found');
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  });

  return { success: true };
}

export async function deleteApiKey(userId: string, keyId: string) {
  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!apiKey) {
    throw new AppError(404, 'API key not found');
  }

  await prisma.apiKey.delete({
    where: { id: keyId },
  });

  return { success: true };
}
