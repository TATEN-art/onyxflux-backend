import { Logger } from '../utils/logger';
import { BotService } from './bot.service';
import prisma from '../config/database';
import { NovaWebSocketV2 } from '../nova_v2/nova.websocket';
import { PriceData, WhaleData, LiquidityData } from '../nova_v2/nova.engine';

const logger = new Logger('BotQueue');

export class BotQueue {
  private botService: BotService;
  private novaWebSocket: NovaWebSocketV2;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  
  constructor(novaWebSocket: NovaWebSocketV2) {
    this.botService = new BotService();
    this.novaWebSocket = novaWebSocket;
  }
  
  /**
   * Start the bot queue (runs every 30 seconds)
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Bot queue is already running');
      return;
    }
    
    logger.info('Starting bot queue - signals will be generated every 30 seconds');
    
    this.isRunning = true;
    
    this.processAllBots();
    
    this.intervalId = setInterval(() => {
      this.processAllBots();
    }, 30000);
  }
  
  /**
   * Stop the bot queue
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Bot queue is not running');
      return;
    }
    
    logger.info('Stopping bot queue');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
  }
  
  /**
   * Process all active bots
   */
  private async processAllBots(): Promise<void> {
    try {
      logger.debug('Processing all active bots');
      
      const activeBots = await prisma.botConfigV2.findMany({
        where: {
          status: 'active',
        },
      });
      
      if (activeBots.length === 0) {
        logger.debug('No active bots to process');
        return;
      }
      
      logger.info(`Processing ${activeBots.length} active bots`);
      
      for (const bot of activeBots) {
        try {
          await this.processSingleBot(bot);
        } catch (error) {
          logger.error(`Error processing bot ${bot.id}:`, error);
        }
      }
      
      logger.info(`Finished processing ${activeBots.length} bots`);
    } catch (error) {
      logger.error('Error in bot queue processing:', error);
    }
  }
  
  /**
   * Process a single bot
   */
  private async processSingleBot(bot: any): Promise<void> {
    try {
      logger.debug(`Processing bot ${bot.id} for token ${bot.token} on ${bot.chain}`);
      
      const priceData = await this.fetchPriceData(bot.token, bot.chain);
      const whaleData = await this.fetchWhaleData(bot.token, bot.chain);
      const liquidityData = await this.fetchLiquidityData(bot.token, bot.chain);
      
      const signal = await this.botService.runNovaStrategy(
        bot.id,
        priceData,
        whaleData,
        liquidityData
      );
      
      logger.info(`Signal generated for bot ${bot.id}: ${signal.signal} (${signal.strength}, confidence: ${(signal.confidence * 100).toFixed(0)}%)`);
      
      if (bot.notificationsEnabled) {
        this.novaWebSocket.broadcastSignal(bot.token, bot.chain, {
          signal: signal.signal,
          strength: signal.strength,
          confidence: signal.confidence,
          price: signal.price,
          timestamp: signal.timestamp,
          timeframe: '15m',
          reasoning: signal.reasoning,
        });
      }
      
      if (signal.signal !== 'HOLD' && signal.confidence > 0.65) {
        await this.sendBotNotification(bot, signal);
      }
    } catch (error) {
      logger.error(`Error processing bot ${bot.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch price data for token
   * (Mock implementation - would fetch from actual data sources)
   */
  private async fetchPriceData(token: string, chain: string): Promise<PriceData[]> {
    const data: PriceData[] = [];
    const basePrice = 100 + Math.random() * 50;
    const now = Date.now();
    
    for (let i = 0; i < 200; i++) {
      const timestamp = now - (200 - i) * 60000; // 1 minute intervals
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      const price = i === 0 ? basePrice : data[i - 1].close * (1 + change);
      
      data.push({
        timestamp,
        open: price * (1 + (Math.random() - 0.5) * 0.005),
        high: price * (1 + Math.random() * 0.01),
        low: price * (1 - Math.random() * 0.01),
        close: price,
        volume: Math.random() * 1000000,
        price, // Add for compatibility
      });
    }
    
    return data;
  }
  
  /**
   * Fetch whale data for token
   * (Mock implementation - would fetch from actual data sources)
   */
  private async fetchWhaleData(token: string, chain: string): Promise<WhaleData[]> {
    const data: WhaleData[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 10; i++) {
      data.push({
        amount: Math.random() * 1000000,
        amountUsd: Math.random() * 500000 + 250000,
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: now - Math.random() * 3600000, // Last hour
      });
    }
    
    return data;
  }
  
  /**
   * Fetch liquidity data for token
   * (Mock implementation - would fetch from actual data sources)
   */
  private async fetchLiquidityData(token: string, chain: string): Promise<LiquidityData[]> {
    const baseLiquidity = 5000000 + Math.random() * 2000000;
    const now = Date.now();
    
    return [
      {
        liquidityUsd: baseLiquidity * 0.95,
        volume24h: Math.random() * 1000000,
        timestamp: now - 3600000, // 1 hour ago
      },
      {
        liquidityUsd: baseLiquidity,
        volume24h: Math.random() * 1000000,
        timestamp: now,
      },
    ];
  }
  
  /**
   * Send notification to user about bot signal
   */
  private async sendBotNotification(bot: any, signal: any): Promise<void> {
    try {
      await prisma.alert.create({
        data: {
          userId: bot.userId,
          type: 'BREAKOUT_SIGNAL', // Using existing enum
          title: `Bot Signal: ${signal.signal}`,
          message: `Your bot for ${bot.token} generated a ${signal.strength} ${signal.signal} signal with ${(signal.confidence * 100).toFixed(0)}% confidence.`,
          severity: signal.strength === 'VERY_STRONG' ? 'high' : signal.strength === 'STRONG' ? 'medium' : 'low',
          metadata: {
            botId: bot.id,
            token: bot.token,
            chain: bot.chain,
            signal: signal.signal,
            strength: signal.strength,
            confidence: signal.confidence,
            price: signal.price,
            reasoning: signal.reasoning,
          },
          read: false,
        },
      });
      
      logger.info(`Notification sent for bot ${bot.id}`);
    } catch (error) {
      logger.error('Error sending bot notification:', error);
    }
  }
  
  /**
   * Get queue status
   */
  getStatus(): {
    isRunning: boolean;
    nextRunIn: number | null;
  } {
    return {
      isRunning: this.isRunning,
      nextRunIn: this.isRunning ? 30000 : null,
    };
  }
}
