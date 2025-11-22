import prisma from '../config/database';
import redis from '../config/redis';
import { Logger } from '../utils/logger';
import { ChainsService } from '../chains/chains.service';

const logger = new Logger('AnalyticsService');

export class AnalyticsService {
  private chainsService: ChainsService;

  constructor(chainsService: ChainsService) {
    this.chainsService = chainsService;
  }

  async getSystemMetrics() {
    try {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const requests24h = await this.getRequests24h();
      const averageLatency = await this.getAverageLatency();
      const successRate = await this.getSuccessRate();
      const activeUsers = await this.getActiveUsers24h();
      const novaUsage = await this.getNovaUsage24h();
      const whaleEvents = await this.getWhaleEvents24h();
      const manipulationAlerts = await this.getManipulationAlerts24h();

      const chainStatus = await this.chainsService.getAllChainsStatus();

      return {
        requests24h,
        averageLatency,
        successRate,
        activeUsers,
        novaUsage,
        whaleEvents,
        manipulationAlerts,
        chainStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  async getUserMetrics(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          apiRequestCount: true,
          novaRequestCount: true,
          novaCreditsLeft: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date().toISOString().split('T')[0];
      const usageKey = `usage:${userId}:${today}`;
      const usageToday = await redis.get(usageKey);

      return {
        plan: user.plan,
        totalApiRequests: user.apiRequestCount,
        totalNovaRequests: user.novaRequestCount,
        novaCreditsLeft: user.novaCreditsLeft,
        requestsToday: parseInt(usageToday || '0'),
        memberSince: user.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get user metrics:', error);
      throw error;
    }
  }

  async getUsageStats(userId: string) {
    try {
      const last7Days = [];
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const usageKey = `usage:${userId}:${dateStr}`;
        const usage = await redis.get(usageKey);

        last7Days.push({
          date: dateStr,
          requests: parseInt(usage || '0'),
        });
      }

      return { last7Days };
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      throw error;
    }
  }

  private async getRequests24h(): Promise<number> {
    const keys = await redis.keys('usage:*');
    let total = 0;

    for (const key of keys) {
      const value = await redis.get(key);
      total += parseInt(value || '0');
    }

    return total;
  }

  private async getAverageLatency(): Promise<number> {
    const keys = await redis.keys('metrics:rpc:*');
    let totalLatency = 0;
    let count = 0;

    for (const key of keys) {
      const metrics = await redis.lrange(key, 0, 99);
      for (const metric of metrics) {
        try {
          const data = JSON.parse(metric);
          if (data.latency > 0) {
            totalLatency += data.latency;
            count++;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return count > 0 ? totalLatency / count : 0;
  }

  private async getSuccessRate(): Promise<number> {
    const keys = await redis.keys('metrics:rpc:*');
    let successCount = 0;
    let totalCount = 0;

    for (const key of keys) {
      const metrics = await redis.lrange(key, 0, 99);
      for (const metric of metrics) {
        try {
          const data = JSON.parse(metric);
          totalCount++;
          if (data.success) successCount++;
        } catch (e) {
          continue;
        }
      }
    }

    return totalCount > 0 ? successCount / totalCount : 1;
  }

  private async getActiveUsers24h(): Promise<number> {
    const users = await prisma.user.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    return users.length;
  }

  private async getNovaUsage24h(): Promise<number> {
    const users = await prisma.user.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      select: {
        novaRequestCount: true,
      },
    });

    return users.reduce((sum, user) => sum + user.novaRequestCount, 0);
  }

  private async getWhaleEvents24h(): Promise<number> {
    return prisma.whaleActivity.count({
      where: {
        detectedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
  }

  private async getManipulationAlerts24h(): Promise<number> {
    return prisma.manipulationEvent.count({
      where: {
        detectedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
  }

  async recordSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.getSystemMetrics();

      await prisma.systemMetrics.create({
        data: {
          requests24h: metrics.requests24h,
          averageLatency: metrics.averageLatency,
          successRate: metrics.successRate,
          activeUsers: metrics.activeUsers,
          novaUsage: metrics.novaUsage,
          whaleEvents: metrics.whaleEvents,
          manipulationAlerts: metrics.manipulationAlerts,
        },
      });

      logger.info('System metrics recorded');
    } catch (error) {
      logger.error('Failed to record system metrics:', error);
    }
  }
}
