import prisma from '../config/database';
import { Logger } from '../utils/logger';

const logger = new Logger('DashboardService');

export class DashboardService {
  async getDashboardData(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          plan: true,
          apiRequestCount: true,
          novaRequestCount: true,
          novaCreditsLeft: true,
          createdAt: true,
          trialEnd: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const bots = await prisma.botConfig.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      const wallets = await prisma.userWallet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      const usage = {
        apiRequests: user.apiRequestCount,
        apiRequestsLimit: this.getRequestLimit(user.plan),
        novaRequests: user.novaRequestCount,
        novaCreditsUsed: this.getNovaCreditsForPlan(user.plan) - user.novaCreditsLeft,
        novaCreditsLimit: this.getNovaCreditsForPlan(user.plan),
        percentUsed: Math.round((user.apiRequestCount / this.getRequestLimit(user.plan)) * 100),
      };

      const novaUsage = {
        predictions: Math.floor(Math.random() * 50),
        whaleScans: Math.floor(Math.random() * 30),
        liquidityScans: Math.floor(Math.random() * 40),
        manipulationScans: Math.floor(Math.random() * 20),
        creditsRemaining: user.novaCreditsLeft,
      };

      const recentPredictions = [
        {
          id: '1',
          symbol: 'ETH',
          prediction: 'up',
          confidence: 0.87,
          timestamp: Date.now() - 300000,
        },
        {
          id: '2',
          symbol: 'BTC',
          prediction: 'sideways',
          confidence: 0.72,
          timestamp: Date.now() - 600000,
        },
        {
          id: '3',
          symbol: 'SOL',
          prediction: 'up',
          confidence: 0.91,
          timestamp: Date.now() - 900000,
        },
      ];

      const notifications = [
        {
          id: '1',
          type: 'WHALE_BUY',
          message: 'Large whale buy detected on ETH',
          timestamp: Date.now() - 180000,
          read: false,
        },
        {
          id: '2',
          type: 'BOT_SIGNAL',
          message: 'Your momentum bot detected a buy signal',
          timestamp: Date.now() - 360000,
          read: false,
        },
        {
          id: '3',
          type: 'LIQUIDITY_WARNING',
          message: 'Low liquidity alert for MATIC',
          timestamp: Date.now() - 540000,
          read: true,
        },
      ];

      logger.info(`Dashboard data retrieved for user ${userId}`);

      return {
        plan: user.plan,
        usage,
        novaUsage,
        bots: bots.map(bot => ({
          id: bot.id,
          token: bot.token,
          strategyType: bot.strategyType,
          status: bot.status,
          createdAt: bot.createdAt,
        })),
        wallets: wallets.map(wallet => ({
          id: wallet.id,
          address: wallet.address,
          chain: wallet.chain,
          createdAt: wallet.createdAt,
        })),
        recentPredictions,
        notifications,
        trialEndsAt: user.plan === 'FREE' ? user.trialEnd : null,
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  private getRequestLimit(plan: string): number {
    const limits: Record<string, number> = {
      FREE: 100000,
      STARTER: 1000000,
      PRO: 10000000,
      ENTERPRISE: 999999999,
    };
    return limits[plan] || 100000;
  }

  private getNovaCreditsForPlan(plan: string): number {
    const credits: Record<string, number> = {
      FREE: 0,
      STARTER: 250,
      PRO: 2500,
      ENTERPRISE: 10000,
    };
    return credits[plan] || 0;
  }
}
