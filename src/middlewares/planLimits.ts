import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../utils/logger';
import prisma from '../config/database';

const logger = new Logger('PlanLimits');

export interface PlanLimits {
  novaEnabled: boolean;
  novaMaxTokens: number;
  
  botBuilderEnabled: boolean;
  maxBots: number;
  
  tokenGeneratorEnabled: boolean;
  tokenGeneratorUsesPerMonth: number;
  
  backtestingEnabled: boolean;
  backtestsPerMonth: number;
  
  strategyHubEnabled: boolean;
  maxStrategies: number;
  
  dangerAlertsEnabled: boolean;
  
  requestsPerMinute: number;
  
  priority: 'low' | 'medium' | 'high';
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    novaEnabled: false,
    novaMaxTokens: 0,
    botBuilderEnabled: false,
    maxBots: 0,
    tokenGeneratorEnabled: false,
    tokenGeneratorUsesPerMonth: 0,
    backtestingEnabled: false,
    backtestsPerMonth: 0,
    strategyHubEnabled: false,
    maxStrategies: 0,
    dangerAlertsEnabled: false,
    requestsPerMinute: 10,
    priority: 'low',
  },
  STARTER: {
    novaEnabled: false,
    novaMaxTokens: 0,
    botBuilderEnabled: false,
    maxBots: 0,
    tokenGeneratorEnabled: false,
    tokenGeneratorUsesPerMonth: 0,
    backtestingEnabled: false,
    backtestsPerMonth: 0,
    strategyHubEnabled: false,
    maxStrategies: 0,
    dangerAlertsEnabled: false,
    requestsPerMinute: 100,
    priority: 'low',
  },
  PRO: {
    novaEnabled: true,
    novaMaxTokens: 10,
    botBuilderEnabled: true,
    maxBots: 5,
    tokenGeneratorEnabled: true,
    tokenGeneratorUsesPerMonth: 3,
    backtestingEnabled: true,
    backtestsPerMonth: 3,
    strategyHubEnabled: true,
    maxStrategies: 10,
    dangerAlertsEnabled: true,
    requestsPerMinute: 1000,
    priority: 'medium',
  },
  ENTERPRISE: {
    novaEnabled: true,
    novaMaxTokens: -1, // unlimited
    botBuilderEnabled: true,
    maxBots: -1, // unlimited
    tokenGeneratorEnabled: true,
    tokenGeneratorUsesPerMonth: -1, // unlimited
    backtestingEnabled: true,
    backtestsPerMonth: -1, // unlimited
    strategyHubEnabled: true,
    maxStrategies: -1, // unlimited
    dangerAlertsEnabled: true,
    requestsPerMinute: 10000,
    priority: 'high',
  },
};

/**
 * Middleware to check if user has access to Nova features
 */
export async function requireNova(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request as any).user?.userId;
    
    if (!userId) {
      return reply.code(401).send({
        error: 'Authentication required',
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }
    
    const limits = PLAN_LIMITS[user.plan];
    
    if (!limits.novaEnabled) {
      return reply.code(403).send({
        error: 'Nova features are not available on your plan',
        upgrade: 'Upgrade to Pro or Enterprise to access Nova Intelligence',
      });
    }
    
    (request as any).planLimits = limits;
  } catch (error) {
    logger.error('Error checking Nova access:', error);
    return reply.code(500).send({
      error: 'Failed to verify access',
    });
  }
}

/**
 * Middleware to check if user has access to Bot Builder
 */
export async function requireBotBuilder(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request as any).user?.userId;
    
    if (!userId) {
      return reply.code(401).send({
        error: 'Authentication required',
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }
    
    const limits = PLAN_LIMITS[user.plan];
    
    if (!limits.botBuilderEnabled) {
      return reply.code(403).send({
        error: 'Bot Builder is not available on your plan',
        upgrade: 'Upgrade to Pro or Enterprise to access Bot Builder',
      });
    }
    
    if (limits.maxBots > 0) {
      const botCount = await prisma.botConfigV2.count({
        where: { userId },
      });
      
      if (botCount >= limits.maxBots) {
        return reply.code(403).send({
          error: `Bot limit reached for ${user.plan} plan (${limits.maxBots} bots)`,
          upgrade: 'Upgrade to Enterprise for unlimited bots',
        });
      }
    }
    
    (request as any).planLimits = limits;
  } catch (error) {
    logger.error('Error checking Bot Builder access:', error);
    return reply.code(500).send({
      error: 'Failed to verify access',
    });
  }
}

/**
 * Middleware to check if user has access to Token Generator
 */
export async function requireTokenGenerator(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request as any).user?.userId;
    
    if (!userId) {
      return reply.code(401).send({
        error: 'Authentication required',
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }
    
    const limits = PLAN_LIMITS[user.plan];
    
    if (!limits.tokenGeneratorEnabled) {
      return reply.code(403).send({
        error: 'Token Generator is not available on your plan',
        upgrade: 'Upgrade to Pro or Enterprise to access Token Generator',
      });
    }
    
    if (request.method === 'POST' && request.url.includes('/generate')) {
      if (limits.tokenGeneratorUsesPerMonth > 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
      }
    }
    
    (request as any).planLimits = limits;
  } catch (error) {
    logger.error('Error checking Token Generator access:', error);
    return reply.code(500).send({
      error: 'Failed to verify access',
    });
  }
}

/**
 * Middleware to check if user has access to Backtesting
 */
export async function requireBacktesting(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request as any).user?.userId;
    
    if (!userId) {
      return reply.code(401).send({
        error: 'Authentication required',
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }
    
    const limits = PLAN_LIMITS[user.plan];
    
    if (!limits.backtestingEnabled) {
      return reply.code(403).send({
        error: 'Backtesting is not available on your plan',
        upgrade: 'Upgrade to Pro or Enterprise to access Backtesting',
      });
    }
    
    if (request.method === 'POST' && request.url.includes('/run')) {
      if (limits.backtestsPerMonth > 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const backtestCount = await prisma.backtest.count({
          where: {
            userId,
            createdAt: { gte: thirtyDaysAgo },
          },
        });
        
        if (backtestCount >= limits.backtestsPerMonth) {
          return reply.code(403).send({
            error: `Backtest limit reached for ${user.plan} plan (${limits.backtestsPerMonth} per month)`,
            upgrade: 'Upgrade to Enterprise for unlimited backtests',
          });
        }
      }
    }
    
    (request as any).planLimits = limits;
  } catch (error) {
    logger.error('Error checking Backtesting access:', error);
    return reply.code(500).send({
      error: 'Failed to verify access',
    });
  }
}

/**
 * Middleware to check if user has access to Strategy Hub
 */
export async function requireStrategyHub(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request as any).user?.userId;
    
    if (!userId) {
      return reply.code(401).send({
        error: 'Authentication required',
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }
    
    const limits = PLAN_LIMITS[user.plan];
    
    if (!limits.strategyHubEnabled) {
      return reply.code(403).send({
        error: 'Strategy Hub is not available on your plan',
        upgrade: 'Upgrade to Pro or Enterprise to access Strategy Hub',
      });
    }
    
    if (request.method === 'POST' && request.url.includes('/create')) {
      if (limits.maxStrategies > 0) {
        const strategyCount = await prisma.strategy.count({
          where: { userId },
        });
        
        if (strategyCount >= limits.maxStrategies) {
          return reply.code(403).send({
            error: `Strategy limit reached for ${user.plan} plan (${limits.maxStrategies} strategies)`,
            upgrade: 'Upgrade to Enterprise for unlimited strategies',
          });
        }
      }
    }
    
    (request as any).planLimits = limits;
  } catch (error) {
    logger.error('Error checking Strategy Hub access:', error);
    return reply.code(500).send({
      error: 'Failed to verify access',
    });
  }
}

/**
 * Get plan limits for a user
 */
export async function getPlanLimits(userId: string): Promise<PlanLimits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return PLAN_LIMITS[user.plan];
}
