import prisma from '../config/database';
import { PLAN_LIMITS } from '../config/plans';
import { Logger } from '../utils/logger';

const logger = new Logger('UsersService');

export class UsersService {
  async upgradePlan(userId: string, plan: 'STARTER' | 'PRO' | 'ENTERPRISE'): Promise<void> {
    const planLimits = PLAN_LIMITS[plan];
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        novaCreditsLeft: planLimits.novaCredits,
      },
    });

    logger.info(`User ${userId} upgraded to ${plan}`);
  }

  async deductNovaCredits(userId: string, amount: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.novaCreditsLeft < amount) {
      return false;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        novaCreditsLeft: { decrement: amount },
        novaRequestCount: { increment: 1 },
      },
    });

    return true;
  }

  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plan: true,
        trialStart: true,
        trialEnd: true,
        novaCreditsLeft: true,
        apiRequestCount: true,
        novaRequestCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const planLimits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];
    const isTrialExpired = user.plan === 'FREE' && user.trialEnd < new Date();

    return {
      ...user,
      planLimits,
      isTrialExpired,
    };
  }
}
