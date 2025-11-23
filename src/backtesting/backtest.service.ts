import { Logger } from '../utils/logger';
import prisma from '../config/database';
import { BacktestEngine, BacktestConfig, BacktestResult } from './backtest.engine';
import { PriceData, WhaleData, LiquidityData } from '../nova_v2/nova.engine';

const logger = new Logger('BacktestService');

export class BacktestService {
  private backtestEngine: BacktestEngine;
  
  constructor() {
    this.backtestEngine = new BacktestEngine();
  }
  
  /**
   * Run a new backtest
   */
  async runBacktest(
    userId: string,
    config: BacktestConfig
  ): Promise<BacktestResult> {
    try {
      logger.info(`Running backtest for user ${userId}`);
      
      await this.validateUserAccess(userId);
      
      const priceData = await this.fetchHistoricalPriceData(
        config.token,
        config.chain,
        config.startDate,
        config.endDate
      );
      
      const whaleData = await this.fetchHistoricalWhaleData(
        config.token,
        config.chain,
        config.startDate,
        config.endDate
      );
      
      const liquidityData = await this.fetchHistoricalLiquidityData(
        config.token,
        config.chain,
        config.startDate,
        config.endDate
      );
      
      const result = await this.backtestEngine.runBacktest(
        config,
        priceData,
        whaleData,
        liquidityData
      );
      
      await this.saveBacktest(userId, result);
      
      logger.info(`Backtest completed for user ${userId}: ${result.totalTrades} trades, ${result.winRate.toFixed(1)}% win rate`);
      
      return result;
    } catch (error) {
      logger.error('Error running backtest:', error);
      throw error;
    }
  }
  
  /**
   * Get backtest by ID
   */
  async getBacktest(userId: string, backtestId: string): Promise<BacktestResult> {
    try {
      const backtest = await prisma.backtest.findUnique({
        where: { id: backtestId },
      });
      
      if (!backtest || backtest.userId !== userId) {
        throw new Error('Backtest not found or access denied');
      }
      
      return backtest.result as BacktestResult;
    } catch (error) {
      logger.error('Error fetching backtest:', error);
      throw error;
    }
  }
  
  /**
   * List user's backtests
   */
  async listBacktests(userId: string, limit: number = 20): Promise<Array<{
    id: string;
    token: string;
    chain: string;
    strategy: string;
    winRate: number;
    totalReturn: number;
    createdAt: Date;
  }>> {
    try {
      const backtests = await prisma.backtest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      
      return backtests.map(b => {
        const result = b.result as BacktestResult;
        return {
          id: b.id,
          token: result.config.token,
          chain: result.config.chain,
          strategy: result.config.strategy,
          winRate: result.winRate,
          totalReturn: result.totalReturnPercent,
          createdAt: b.createdAt,
        };
      });
    } catch (error) {
      logger.error('Error listing backtests:', error);
      throw error;
    }
  }
  
  /**
   * Delete backtest
   */
  async deleteBacktest(userId: string, backtestId: string): Promise<void> {
    try {
      const backtest = await prisma.backtest.findUnique({
        where: { id: backtestId },
      });
      
      if (!backtest || backtest.userId !== userId) {
        throw new Error('Backtest not found or access denied');
      }
      
      await prisma.backtest.delete({
        where: { id: backtestId },
      });
      
      logger.info(`Backtest ${backtestId} deleted`);
    } catch (error) {
      logger.error('Error deleting backtest:', error);
      throw error;
    }
  }
  
  /**
   * Compare multiple backtests
   */
  async compareBacktests(
    userId: string,
    backtestIds: string[]
  ): Promise<{
    backtests: Array<{
      id: string;
      config: BacktestConfig;
      winRate: number;
      totalReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
    }>;
    bestBacktest: string;
    comparison: string[];
  }> {
    try {
      const backtests = await prisma.backtest.findMany({
        where: {
          id: { in: backtestIds },
          userId,
        },
      });
      
      if (backtests.length === 0) {
        throw new Error('No backtests found');
      }
      
      const comparison = backtests.map(b => {
        const result = b.result as BacktestResult;
        return {
          id: b.id,
          config: result.config,
          winRate: result.winRate,
          totalReturn: result.totalReturnPercent,
          sharpeRatio: result.sharpeRatio,
          maxDrawdown: result.maxDrawdownPercent,
        };
      });
      
      const bestBacktest = comparison.reduce((best, current) => 
        current.totalReturn > best.totalReturn ? current : best
      );
      
      const insights: string[] = [];
      
      insights.push(`Best performing: ${bestBacktest.config.strategy} with ${bestBacktest.totalReturn.toFixed(2)}% return`);
      
      const avgWinRate = comparison.reduce((sum, b) => sum + b.winRate, 0) / comparison.length;
      insights.push(`Average win rate: ${avgWinRate.toFixed(1)}%`);
      
      const avgReturn = comparison.reduce((sum, b) => sum + b.totalReturn, 0) / comparison.length;
      insights.push(`Average return: ${avgReturn.toFixed(2)}%`);
      
      return {
        backtests: comparison,
        bestBacktest: bestBacktest.id,
        comparison: insights,
      };
    } catch (error) {
      logger.error('Error comparing backtests:', error);
      throw error;
    }
  }
  
  /**
   * Validate user has access to backtesting
   */
  private async validateUserAccess(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const backtestCount = await prisma.backtest.count({
      where: { 
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });
    
    const limits: Record<string, number> = {
      FREE: 0,
      STARTER: 5,
      PRO: 50,
      ENTERPRISE: 500,
    };
    
    const limit = limits[user.plan] || 0;
    
    if (backtestCount >= limit) {
      throw new Error(`Backtest limit reached for ${user.plan} plan (${limit} per month)`);
    }
  }
  
  /**
   * Save backtest to database
   */
  private async saveBacktest(userId: string, result: BacktestResult): Promise<void> {
    try {
      await prisma.backtest.create({
        data: {
          userId,
          result: result as any,
        },
      });
      
      logger.info(`Backtest saved for user ${userId}`);
    } catch (error) {
      logger.error('Error saving backtest:', error);
    }
  }
  
  /**
   * Fetch historical price data
   * (Mock implementation - would fetch from actual data sources)
   */
  private async fetchHistoricalPriceData(
    token: string,
    chain: string,
    startDate: number,
    endDate: number
  ): Promise<PriceData[]> {
    const data: PriceData[] = [];
    const basePrice = 100 + Math.random() * 50;
    const interval = 60000; // 1 minute
    
    for (let timestamp = startDate; timestamp <= endDate; timestamp += interval) {
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      const price = data.length === 0 ? basePrice : data[data.length - 1].close * (1 + change);
      
      data.push({
        timestamp,
        open: price * (1 + (Math.random() - 0.5) * 0.005),
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        close: price,
        volume: Math.random() * 1000000,
        price,
      });
    }
    
    return data;
  }
  
  /**
   * Fetch historical whale data
   * (Mock implementation - would fetch from actual data sources)
   */
  private async fetchHistoricalWhaleData(
    token: string,
    chain: string,
    startDate: number,
    endDate: number
  ): Promise<WhaleData[]> {
    const data: WhaleData[] = [];
    const interval = 3600000; // 1 hour
    
    for (let timestamp = startDate; timestamp <= endDate; timestamp += interval) {
      if (Math.random() > 0.7) {
        data.push({
          amount: Math.random() * 1000000,
          amountUsd: Math.random() * 500000 + 250000,
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          timestamp,
        });
      }
    }
    
    return data;
  }
  
  /**
   * Fetch historical liquidity data
   * (Mock implementation - would fetch from actual data sources)
   */
  private async fetchHistoricalLiquidityData(
    token: string,
    chain: string,
    startDate: number,
    endDate: number
  ): Promise<LiquidityData[]> {
    const data: LiquidityData[] = [];
    const baseLiquidity = 5000000 + Math.random() * 2000000;
    const interval = 3600000; // 1 hour
    
    for (let timestamp = startDate; timestamp <= endDate; timestamp += interval) {
      const change = (Math.random() - 0.5) * 0.1;
      const liquidity = data.length === 0 ? baseLiquidity : data[data.length - 1].liquidityUsd * (1 + change);
      
      data.push({
        liquidityUsd: liquidity,
        volume24h: Math.random() * 1000000,
        timestamp,
      });
    }
    
    return data;
  }
}
