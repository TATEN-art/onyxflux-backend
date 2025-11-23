import { Logger } from '../utils/logger';
import prisma from '../config/database';

const logger = new Logger('StrategiesService');

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  strategyType: 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '24h';
  riskLevel: 'low' | 'medium' | 'high';
  
  parameters: {
    stopLossPercent?: number;
    takeProfitPercent?: number;
    entryConditions?: string[];
    exitConditions?: string[];
    indicators?: string[];
  };
  
  backtestResults?: {
    winRate: number;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  
  isPublic: boolean;
  isNovaVerified: boolean;
  likes: number;
  views: number;
  copies: number;
  
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStrategyRequest {
  name: string;
  description: string;
  strategyType: string;
  timeframe: string;
  riskLevel: string;
  parameters: any;
  isPublic?: boolean;
  tags?: string[];
}

export class StrategiesService {
  /**
   * Create a new strategy
   */
  async createStrategy(userId: string, request: CreateStrategyRequest): Promise<Strategy> {
    try {
      logger.info(`Creating strategy for user ${userId}: ${request.name}`);
      
      await this.validateUserAccess(userId);
      
      const strategy = await prisma.strategy.create({
        data: {
          userId,
          name: request.name,
          description: request.description,
          strategyType: request.strategyType,
          timeframe: request.timeframe,
          riskLevel: request.riskLevel,
          parameters: request.parameters,
          isPublic: request.isPublic || false,
          isNovaVerified: false,
          likes: 0,
          views: 0,
          copies: 0,
          tags: request.tags || [],
        },
      });
      
      logger.info(`Strategy created: ${strategy.id}`);
      
      return this.mapPrismaStrategyToModel(strategy);
    } catch (error) {
      logger.error('Error creating strategy:', error);
      throw error;
    }
  }
  
  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string, viewerId?: string): Promise<Strategy> {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });
      
      if (!strategy) {
        throw new Error('Strategy not found');
      }
      
      if (!strategy.isPublic && strategy.userId !== viewerId) {
        throw new Error('Strategy is private');
      }
      
      await prisma.strategy.update({
        where: { id: strategyId },
        data: { views: { increment: 1 } },
      });
      
      return this.mapPrismaStrategyToModel(strategy);
    } catch (error) {
      logger.error('Error fetching strategy:', error);
      throw error;
    }
  }
  
  /**
   * Get popular strategies
   */
  async getPopularStrategies(limit: number = 20): Promise<Strategy[]> {
    try {
      const strategies = await prisma.strategy.findMany({
        where: { isPublic: true },
        orderBy: [
          { likes: 'desc' },
          { views: 'desc' },
        ],
        take: limit,
      });
      
      return strategies.map(this.mapPrismaStrategyToModel);
    } catch (error) {
      logger.error('Error fetching popular strategies:', error);
      throw error;
    }
  }
  
  /**
   * Get top performing strategies
   */
  async getTopStrategies(limit: number = 20): Promise<Strategy[]> {
    try {
      const strategies = await prisma.strategy.findMany({
        where: {
          isPublic: true,
          backtestResults: { not: null },
        },
        take: limit * 2, // Fetch more to filter
      });
      
      const sorted = strategies
        .filter(s => s.backtestResults && (s.backtestResults as any).winRate > 50)
        .sort((a, b) => {
          const aResults = a.backtestResults as any;
          const bResults = b.backtestResults as any;
          return (bResults.totalReturn || 0) - (aResults.totalReturn || 0);
        })
        .slice(0, limit);
      
      return sorted.map(this.mapPrismaStrategyToModel);
    } catch (error) {
      logger.error('Error fetching top strategies:', error);
      throw error;
    }
  }
  
  /**
   * Get Nova-verified strategies
   */
  async getNovaVerifiedStrategies(limit: number = 20): Promise<Strategy[]> {
    try {
      const strategies = await prisma.strategy.findMany({
        where: {
          isPublic: true,
          isNovaVerified: true,
        },
        orderBy: [
          { likes: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });
      
      return strategies.map(this.mapPrismaStrategyToModel);
    } catch (error) {
      logger.error('Error fetching Nova-verified strategies:', error);
      throw error;
    }
  }
  
  /**
   * Get user's strategies
   */
  async getUserStrategies(userId: string): Promise<Strategy[]> {
    try {
      const strategies = await prisma.strategy.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      
      return strategies.map(this.mapPrismaStrategyToModel);
    } catch (error) {
      logger.error('Error fetching user strategies:', error);
      throw error;
    }
  }
  
  /**
   * Update strategy
   */
  async updateStrategy(
    userId: string,
    strategyId: string,
    updates: Partial<CreateStrategyRequest>
  ): Promise<Strategy> {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });
      
      if (!strategy || strategy.userId !== userId) {
        throw new Error('Strategy not found or access denied');
      }
      
      const updated = await prisma.strategy.update({
        where: { id: strategyId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      
      logger.info(`Strategy updated: ${strategyId}`);
      
      return this.mapPrismaStrategyToModel(updated);
    } catch (error) {
      logger.error('Error updating strategy:', error);
      throw error;
    }
  }
  
  /**
   * Delete strategy
   */
  async deleteStrategy(userId: string, strategyId: string): Promise<void> {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });
      
      if (!strategy || strategy.userId !== userId) {
        throw new Error('Strategy not found or access denied');
      }
      
      await prisma.strategy.delete({
        where: { id: strategyId },
      });
      
      logger.info(`Strategy deleted: ${strategyId}`);
    } catch (error) {
      logger.error('Error deleting strategy:', error);
      throw error;
    }
  }
  
  /**
   * Like a strategy
   */
  async likeStrategy(userId: string, strategyId: string): Promise<void> {
    try {
      const existingLike = await prisma.strategyLike.findUnique({
        where: {
          userId_strategyId: {
            userId,
            strategyId,
          },
        },
      });
      
      if (existingLike) {
        await prisma.strategyLike.delete({
          where: {
            userId_strategyId: {
              userId,
              strategyId,
            },
          },
        });
        
        await prisma.strategy.update({
          where: { id: strategyId },
          data: { likes: { decrement: 1 } },
        });
        
        logger.info(`Strategy unliked: ${strategyId}`);
      } else {
        await prisma.strategyLike.create({
          data: {
            userId,
            strategyId,
          },
        });
        
        await prisma.strategy.update({
          where: { id: strategyId },
          data: { likes: { increment: 1 } },
        });
        
        logger.info(`Strategy liked: ${strategyId}`);
      }
    } catch (error) {
      logger.error('Error liking strategy:', error);
      throw error;
    }
  }
  
  /**
   * Copy a strategy
   */
  async copyStrategy(userId: string, strategyId: string): Promise<Strategy> {
    try {
      const original = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });
      
      if (!original || (!original.isPublic && original.userId !== userId)) {
        throw new Error('Strategy not found or not accessible');
      }
      
      const copy = await prisma.strategy.create({
        data: {
          userId,
          name: `${original.name} (Copy)`,
          description: original.description,
          strategyType: original.strategyType,
          timeframe: original.timeframe,
          riskLevel: original.riskLevel,
          parameters: original.parameters,
          isPublic: false,
          isNovaVerified: false,
          likes: 0,
          views: 0,
          copies: 0,
          tags: original.tags,
        },
      });
      
      await prisma.strategy.update({
        where: { id: strategyId },
        data: { copies: { increment: 1 } },
      });
      
      logger.info(`Strategy copied: ${strategyId} -> ${copy.id}`);
      
      return this.mapPrismaStrategyToModel(copy);
    } catch (error) {
      logger.error('Error copying strategy:', error);
      throw error;
    }
  }
  
  /**
   * Search strategies
   */
  async searchStrategies(query: string, filters?: {
    strategyType?: string;
    timeframe?: string;
    riskLevel?: string;
    tags?: string[];
  }): Promise<Strategy[]> {
    try {
      const where: any = {
        isPublic: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };
      
      if (filters?.strategyType) {
        where.strategyType = filters.strategyType;
      }
      
      if (filters?.timeframe) {
        where.timeframe = filters.timeframe;
      }
      
      if (filters?.riskLevel) {
        where.riskLevel = filters.riskLevel;
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }
      
      const strategies = await prisma.strategy.findMany({
        where,
        orderBy: { likes: 'desc' },
        take: 50,
      });
      
      return strategies.map(this.mapPrismaStrategyToModel);
    } catch (error) {
      logger.error('Error searching strategies:', error);
      throw error;
    }
  }
  
  /**
   * Validate user has access to create strategies
   */
  private async validateUserAccess(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const strategyCount = await prisma.strategy.count({
      where: { userId },
    });
    
    const limits: Record<string, number> = {
      FREE: 0,
      STARTER: 5,
      PRO: 50,
      ENTERPRISE: 500,
    };
    
    const limit = limits[user.plan] || 0;
    
    if (strategyCount >= limit) {
      throw new Error(`Strategy limit reached for ${user.plan} plan (${limit} strategies)`);
    }
  }
  
  /**
   * Map Prisma strategy to model
   */
  private mapPrismaStrategyToModel(strategy: any): Strategy {
    return {
      id: strategy.id,
      userId: strategy.userId,
      name: strategy.name,
      description: strategy.description,
      strategyType: strategy.strategyType,
      timeframe: strategy.timeframe,
      riskLevel: strategy.riskLevel,
      parameters: strategy.parameters as any,
      backtestResults: strategy.backtestResults as any,
      isPublic: strategy.isPublic,
      isNovaVerified: strategy.isNovaVerified,
      likes: strategy.likes,
      views: strategy.views,
      copies: strategy.copies,
      tags: strategy.tags,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
    };
  }
}
