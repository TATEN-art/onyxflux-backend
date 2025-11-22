import prisma from '../config/database';
import { generateApiKey, hashApiKey } from '../utils/crypto';
import { Logger } from '../utils/logger';
import redis from '../config/redis';

const logger = new Logger('ApiKeysService');

export class ApiKeysService {
  async generateKey(userId: string, name?: string): Promise<{ key: string; prefix: string }> {
    const key = generateApiKey();
    const keyHash = await hashApiKey(key);
    const keyPrefix = key.substring(0, 20);

    await prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        keyPrefix,
        name: name || 'Default API Key',
      },
    });

    logger.info(`API key generated for user ${userId}`);
    return { key, prefix: keyPrefix };
  }

  async listKeys(userId: string) {
    const keys = await prisma.apiKey.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys;
  }

  async revokeKey(userId: string, keyId: string): Promise<void> {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!key) {
      throw new Error('API key not found');
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    logger.info(`API key revoked: ${keyId}`);
  }

  async rotateKey(userId: string, keyId: string): Promise<{ key: string; prefix: string }> {
    const oldKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!oldKey) {
      throw new Error('API key not found');
    }

    await this.revokeKey(userId, keyId);
    const newKey = await this.generateKey(userId, oldKey.name || undefined);

    logger.info(`API key rotated for user ${userId}`);
    return newKey;
  }

  async getUsageStats(userId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!key) {
      throw new Error('API key not found');
    }

    const today = new Date().toISOString().split('T')[0];
    const usageKey = `usage:${userId}:${today}`;
    const usage = await redis.get(usageKey);

    return {
      keyId,
      keyPrefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt,
      usageToday: parseInt(usage || '0'),
    };
  }
}
