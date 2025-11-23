import { Logger } from '../utils/logger';
import prisma from '../config/database';
import { NovaEngineV2, PriceData, WhaleData, LiquidityData } from '../nova_v2/nova.engine';
import { NovaStrategyV2 } from '../nova_v2/nova.strategy';
import { NovaSignalsV2 } from '../nova_v2/nova.signals';
import {
  BotConfig,
  CreateBotRequest,
  UpdateBotRequest,
  BotSignal,
  BotPerformance,
  BotWithSignals,
} from './bot.model';

const logger = new Logger('BotService');

export class BotService {
  private novaEngine: NovaEngineV2;
  private novaStrategy: NovaStrategyV2;
  private novaSignals: NovaSignalsV2;
  
  constructor() {
    this.novaEngine = new NovaEngineV2();
    this.novaStrategy = new NovaStrategyV2();
    this.novaSignals = new NovaSignalsV2();
  }
  
  /**
   * Create a new bot
   */
  async createBot(userId: string, request: CreateBotRequest): Promise<BotConfig> {
    try {
      logger.info(`Creating bot for user ${userId}`);
      
      await this.validateUserAccess(userId);
      
      const bot = await prisma.botConfigV2.create({
        data: {
          userId,
          token: request.token,
          chain: request.chain,
          framework: request.framework || 'Nova V2',
          strategy: request.strategy || 'Swing',
          novaConfidence: 0,
          novaPredictions: {},
          riskLevel: request.riskLevel || 'medium',
          notificationsEnabled: request.notificationsEnabled !== false,
          status: 'active',
        },
      });
      
      logger.info(`Bot created successfully: ${bot.id}`);
      
      return this.mapPrismaBotToModel(bot);
    } catch (error) {
      logger.error('Error creating bot:', error);
      throw error;
    }
  }
  
  /**
   * Update bot configuration
   */
  async updateBot(userId: string, botId: string, request: UpdateBotRequest): Promise<BotConfig> {
    try {
      logger.info(`Updating bot ${botId} for user ${userId}`);
      
      const existingBot = await prisma.botConfigV2.findUnique({
        where: { id: botId },
      });
      
      if (!existingBot || existingBot.userId !== userId) {
        throw new Error('Bot not found or access denied');
      }
      
      const bot = await prisma.botConfigV2.update({
        where: { id: botId },
        data: {
          strategy: request.strategy,
          riskLevel: request.riskLevel,
          notificationsEnabled: request.notificationsEnabled,
          status: request.status,
          updatedAt: new Date(),
        },
      });
      
      logger.info(`Bot updated successfully: ${botId}`);
      
      return this.mapPrismaBotToModel(bot);
    } catch (error) {
      logger.error('Error updating bot:', error);
      throw error;
    }
  }
  
  /**
   * Get bot by ID
   */
  async getBot(userId: string, botId: string): Promise<BotConfig> {
    try {
      const bot = await prisma.botConfigV2.findUnique({
        where: { id: botId },
      });
      
      if (!bot || bot.userId !== userId) {
        throw new Error('Bot not found or access denied');
      }
      
      return this.mapPrismaBotToModel(bot);
    } catch (error) {
      logger.error('Error fetching bot:', error);
      throw error;
    }
  }
  
  /**
   * Get bot with signals and performance
   */
  async getBotWithSignals(userId: string, botId: string): Promise<BotWithSignals> {
    try {
      const bot = await this.getBot(userId, botId);
      
      const signals = await prisma.botSignal.findMany({
        where: { botId },
        orderBy: { timestamp: 'desc' },
        take: 20,
      });
      
      const performance = await this.calculateBotPerformance(botId);
      
      return {
        ...bot,
        recentSignals: signals.map(this.mapPrismaSignalToModel),
        performance,
      };
    } catch (error) {
      logger.error('Error fetching bot with signals:', error);
      throw error;
    }
  }
  
  /**
   * List all bots for user
   */
  async listBots(userId: string): Promise<BotConfig[]> {
    try {
      const bots = await prisma.botConfigV2.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      
      return bots.map(this.mapPrismaBotToModel);
    } catch (error) {
      logger.error('Error listing bots:', error);
      throw error;
    }
  }
  
  /**
   * Delete bot
   */
  async deleteBot(userId: string, botId: string): Promise<void> {
    try {
      logger.info(`Deleting bot ${botId} for user ${userId}`);
      
      const bot = await prisma.botConfigV2.findUnique({
        where: { id: botId },
      });
      
      if (!bot || bot.userId !== userId) {
        throw new Error('Bot not found or access denied');
      }
      
      await prisma.botSignal.deleteMany({
        where: { botId },
      });
      
      await prisma.botConfigV2.delete({
        where: { id: botId },
      });
      
      logger.info(`Bot deleted successfully: ${botId}`);
    } catch (error) {
      logger.error('Error deleting bot:', error);
      throw error;
    }
  }
  
  /**
   * Run Nova strategy for bot and generate signals
   */
  async runNovaStrategy(
    botId: string,
    priceData: PriceData[],
    whaleData: WhaleData[],
    liquidityData: LiquidityData[]
  ): Promise<BotSignal> {
    try {
      logger.info(`Running Nova strategy for bot ${botId}`);
      
      const bot = await prisma.botConfigV2.findUnique({
        where: { id: botId },
      });
      
      if (!bot || bot.status !== 'active') {
        throw new Error('Bot not found or not active');
      }
      
      const currentPrice = priceData[priceData.length - 1].close;
      
      const prediction = await this.novaEngine.generatePrediction(
        bot.token,
        bot.chain,
        priceData,
        whaleData,
        liquidityData
      );
      
      await prisma.botConfigV2.update({
        where: { id: botId },
        data: {
          novaConfidence: prediction.overallConfidence,
          novaPredictions: {
            predicted_1m: prediction.predicted_1m,
            predicted_5m: prediction.predicted_5m,
            predicted_15m: prediction.predicted_15m,
            predicted_1h: prediction.predicted_1h,
            predicted_24h: prediction.predicted_24h,
            direction_1m: prediction.direction_1m,
            direction_5m: prediction.direction_5m,
            direction_15m: prediction.direction_15m,
            direction_1h: prediction.direction_1h,
            direction_24h: prediction.direction_24h,
            confidence: prediction.overallConfidence,
            lastUpdated: Date.now(),
          },
          updatedAt: new Date(),
        },
      });
      
      const riskTolerance = bot.riskLevel === 'low' ? 'conservative' : bot.riskLevel === 'high' ? 'aggressive' : 'moderate';
      const strategy = this.novaStrategy.selectStrategy(prediction, currentPrice, riskTolerance);
      
      const signal = this.novaSignals.generateSignal(prediction, strategy, currentPrice, '15m');
      
      const savedSignal = await prisma.botSignal.create({
        data: {
          botId,
          signal: signal.signal,
          strength: signal.strength,
          confidence: signal.confidence,
          price: signal.price,
          reasoning: signal.reasoning,
          timestamp: signal.timestamp,
          executed: false,
          metadata: {
            entryPrice: signal.entryPrice,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            riskRewardRatio: signal.riskRewardRatio,
            timeframe: signal.timeframe,
          },
        },
      });
      
      logger.info(`Signal generated for bot ${botId}: ${signal.signal} (${signal.strength})`);
      
      return this.mapPrismaSignalToModel(savedSignal);
    } catch (error) {
      logger.error('Error running Nova strategy:', error);
      throw error;
    }
  }
  
  /**
   * Generate strategy suggestions for bot
   */
  async generateStrategySuggestions(
    botId: string,
    priceData: PriceData[],
    whaleData: WhaleData[],
    liquidityData: LiquidityData[]
  ): Promise<{
    currentStrategy: string;
    suggestedStrategies: Array<{
      strategy: string;
      confidence: number;
      reasoning: string[];
    }>;
  }> {
    try {
      const bot = await prisma.botConfigV2.findUnique({
        where: { id: botId },
      });
      
      if (!bot) {
        throw new Error('Bot not found');
      }
      
      const currentPrice = priceData[priceData.length - 1].close;
      
      const prediction = await this.novaEngine.generatePrediction(
        bot.token,
        bot.chain,
        priceData,
        whaleData,
        liquidityData
      );
      
      const suggestions = [];
      
      for (const riskLevel of ['conservative', 'moderate', 'aggressive'] as const) {
        const strategy = this.novaStrategy.selectStrategy(prediction, currentPrice, riskLevel);
        
        suggestions.push({
          strategy: strategy.strategyType,
          confidence: strategy.confidence,
          reasoning: strategy.reasoning,
        });
      }
      
      return {
        currentStrategy: bot.strategy,
        suggestedStrategies: suggestions,
      };
    } catch (error) {
      logger.error('Error generating strategy suggestions:', error);
      throw error;
    }
  }
  
  /**
   * Calculate bot performance metrics
   */
  private async calculateBotPerformance(botId: string): Promise<BotPerformance> {
    const signals = await prisma.botSignal.findMany({
      where: { botId },
    });
    
    const totalSignals = signals.length;
    const successfulSignals = signals.filter(s => s.signal !== 'HOLD' && s.confidence > 0.65).length;
    const failedSignals = signals.filter(s => s.signal !== 'HOLD' && s.confidence <= 0.65).length;
    const successRate = totalSignals > 0 ? (successfulSignals / totalSignals) * 100 : 0;
    const averageConfidence = totalSignals > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / totalSignals
      : 0;
    const lastSignalTime = signals.length > 0
      ? Math.max(...signals.map(s => s.timestamp))
      : 0;
    
    return {
      botId,
      totalSignals,
      successfulSignals,
      failedSignals,
      successRate,
      averageConfidence,
      lastSignalTime,
    };
  }
  
  /**
   * Validate user has access to bot creation
   */
  private async validateUserAccess(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const botCount = await prisma.botConfigV2.count({
      where: { userId },
    });
    
    const limits: Record<string, number> = {
      FREE: 0,
      STARTER: 3,
      PRO: 10,
      ENTERPRISE: 50,
    };
    
    const limit = limits[user.plan] || 0;
    
    if (botCount >= limit) {
      throw new Error(`Bot limit reached for ${user.plan} plan (${limit} bots)`);
    }
  }
  
  /**
   * Map Prisma bot to model
   */
  private mapPrismaBotToModel(bot: any): BotConfig {
    return {
      id: bot.id,
      userId: bot.userId,
      token: bot.token,
      chain: bot.chain,
      framework: bot.framework,
      strategy: bot.strategy,
      novaConfidence: bot.novaConfidence,
      novaPredictions: bot.novaPredictions as any,
      riskLevel: bot.riskLevel,
      notificationsEnabled: bot.notificationsEnabled,
      status: bot.status,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
    };
  }
  
  /**
   * Map Prisma signal to model
   */
  private mapPrismaSignalToModel(signal: any): BotSignal {
    return {
      id: signal.id,
      botId: signal.botId,
      signal: signal.signal,
      strength: signal.strength,
      confidence: signal.confidence,
      price: signal.price,
      reasoning: signal.reasoning,
      timestamp: signal.timestamp,
      executed: signal.executed,
    };
  }
}
