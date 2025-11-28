import { TokenData, LiquidityData, WhaleTransaction, VolatilityData } from '../types';
import {
  PriceFeedEvent,
  LiquidityShiftEvent,
  WhaleMovementEvent,
  VolatilitySpikeEvent,
  TrendDirectionEvent,
  RiskScoreEvent,
  AIPredictionEvent,
  MarketSentimentEvent,
  BreakoutAlertEvent,
  NovaEvent,
} from '../../ws/types';
import { riskScoreEngine } from './riskScore';
import { trendClassifier } from './trendClassifier';
import { predictionEngine } from './prediction';
import { streamManager } from '../../ws/streamManager';
import { logger } from '../../utils/logger';

class EventProcessor {
  private eventHistory: Map<string, NovaEvent[]> = new Map();
  private readonly maxHistoryLength = 100;

  processPriceUpdate(tokenData: TokenData): PriceFeedEvent {
    const event: PriceFeedEvent = {
      type: 'price_update',
      symbol: tokenData.symbol,
      chain: tokenData.chain,
      price: tokenData.price,
      change24h: tokenData.change24h,
      volume24h: tokenData.volume24h,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(tokenData.symbol, tokenData.chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processLiquidityShift(liquidityData: LiquidityData): LiquidityShiftEvent {
    const event: LiquidityShiftEvent = {
      type: 'liquidity_shift',
      symbol: liquidityData.symbol,
      chain: liquidityData.chain,
      liquidityChange: liquidityData.liquidityChange,
      direction: liquidityData.direction,
      severity: liquidityData.severity,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(liquidityData.symbol, liquidityData.chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processWhaleMovement(whaleTransaction: WhaleTransaction): WhaleMovementEvent {
    const event: WhaleMovementEvent = {
      type: 'whale_movement',
      symbol: whaleTransaction.symbol,
      chain: whaleTransaction.chain,
      amount: whaleTransaction.amount,
      direction: whaleTransaction.direction,
      walletAddress: whaleTransaction.walletAddress,
      impact: whaleTransaction.impact,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(whaleTransaction.symbol, whaleTransaction.chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processVolatilitySpike(volatilityData: VolatilityData): VolatilitySpikeEvent {
    const event: VolatilitySpikeEvent = {
      type: 'volatility_spike',
      symbol: volatilityData.symbol,
      chain: volatilityData.chain,
      volatilityIndex: volatilityData.volatilityIndex,
      priceSwing: volatilityData.priceSwing,
      severity: volatilityData.severity,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(volatilityData.symbol, volatilityData.chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processTrendDirection(
    symbol: string,
    chain: string,
    tokenData: TokenData | null,
    liquidityData: LiquidityData | null,
    volatilityData: VolatilityData | null,
    whaleActivity: WhaleTransaction[]
  ): TrendDirectionEvent {
    const trendData = trendClassifier.classifyTrend(
      symbol,
      chain,
      tokenData,
      liquidityData,
      volatilityData,
      whaleActivity
    );

    const event: TrendDirectionEvent = {
      type: 'trend_direction',
      symbol: trendData.symbol,
      chain: trendData.chain,
      trend: trendData.trend,
      strength: trendData.strength,
      timeframe: trendData.timeframe,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(symbol, chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processRiskScore(
    symbol: string,
    chain: string,
    tokenData: TokenData | null,
    liquidityData: LiquidityData | null,
    volatilityData: VolatilityData | null,
    whaleActivity: WhaleTransaction[]
  ): RiskScoreEvent {
    const riskData = riskScoreEngine.calculateRiskScore(
      symbol,
      chain,
      tokenData,
      liquidityData,
      volatilityData,
      whaleActivity
    );

    const event: RiskScoreEvent = {
      type: 'risk_score',
      symbol: riskData.symbol,
      chain: riskData.chain,
      riskScore: riskData.riskScore,
      factors: riskData.factors,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(symbol, chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processAIPrediction(
    symbol: string,
    chain: string,
    tokenData: TokenData | null,
    liquidityData: LiquidityData | null,
    volatilityData: VolatilityData | null,
    whaleActivity: WhaleTransaction[]
  ): AIPredictionEvent {
    const trendData = trendClassifier.classifyTrend(
      symbol,
      chain,
      tokenData,
      liquidityData,
      volatilityData,
      whaleActivity
    );

    const predictionData = predictionEngine.generatePrediction(
      symbol,
      chain,
      trendData,
      volatilityData,
      tokenData,
      whaleActivity
    );

    const event: AIPredictionEvent = {
      type: 'ai_prediction',
      symbol: predictionData.symbol,
      chain: predictionData.chain,
      prediction: predictionData.prediction,
      confidence: predictionData.confidence,
      targetPrice: predictionData.targetPrice,
      timeframe: predictionData.timeframe,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(symbol, chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processMarketSentiment(
    symbol: string,
    chain: string,
    tokenData: TokenData | null,
    whaleActivity: WhaleTransaction[]
  ): MarketSentimentEvent {
    const sentiment = this.calculateMarketSentiment(tokenData, whaleActivity);

    const event: MarketSentimentEvent = {
      type: 'market_sentiment',
      symbol,
      chain,
      sentiment: sentiment.sentiment,
      score: sentiment.score,
      sources: sentiment.sources,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(symbol, chain, event);
    this.broadcastEvent(event);

    return event;
  }

  processBreakoutAlert(
    symbol: string,
    chain: string,
    tokenData: TokenData | null,
    volatilityData: VolatilityData | null,
    liquidityData: LiquidityData | null
  ): BreakoutAlertEvent | null {
    if (!tokenData || !volatilityData || !liquidityData) return null;

    const breakoutStatus = trendClassifier.detectBreakout(symbol, chain, volatilityData, liquidityData);

    if (breakoutStatus === 'no_breakout') return null;

    const breakoutType: 'resistance' | 'support' = tokenData.change24h > 0 ? 'resistance' : 'support';
    const level = tokenData.price * (breakoutType === 'resistance' ? 1.05 : 0.95);

    const event: BreakoutAlertEvent = {
      type: 'breakout_alert',
      symbol,
      chain,
      breakoutType,
      price: tokenData.price,
      level,
      confidence: 75,
      timestamp: new Date().toISOString(),
    };

    this.storeEvent(symbol, chain, event);
    this.broadcastEvent(event);

    return event;
  }

  private calculateMarketSentiment(
    tokenData: TokenData | null,
    whaleActivity: WhaleTransaction[]
  ): {
    sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    score: number;
    sources: string[];
  } {
    let score = 50;
    const sources: string[] = [];

    if (tokenData) {
      if (tokenData.change24h > 10) {
        score += 20;
        sources.push('Strong price increase');
      } else if (tokenData.change24h > 5) {
        score += 10;
        sources.push('Moderate price increase');
      } else if (tokenData.change24h < -10) {
        score -= 20;
        sources.push('Strong price decrease');
      } else if (tokenData.change24h < -5) {
        score -= 10;
        sources.push('Moderate price decrease');
      }

      if (tokenData.volume24h > 1000000) {
        score += 5;
        sources.push('High trading volume');
      }
    }

    if (whaleActivity.length > 0) {
      const recentWhales = whaleActivity.slice(-10);
      const buyCount = recentWhales.filter((w) => w.direction === 'buy').length;
      const sellCount = recentWhales.filter((w) => w.direction === 'sell').length;

      if (buyCount > sellCount * 1.5) {
        score += 15;
        sources.push('Whale accumulation');
      } else if (sellCount > buyCount * 1.5) {
        score -= 15;
        sources.push('Whale distribution');
      }
    }

    score = Math.min(Math.max(score, 0), 100);

    let sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    if (score >= 75) sentiment = 'very_bullish';
    else if (score >= 60) sentiment = 'bullish';
    else if (score >= 40) sentiment = 'neutral';
    else if (score >= 25) sentiment = 'bearish';
    else sentiment = 'very_bearish';

    return { sentiment, score, sources };
  }

  private storeEvent(symbol: string, chain: string, event: NovaEvent) {
    const key = `${chain}:${symbol}`;
    let history = this.eventHistory.get(key);

    if (!history) {
      history = [];
      this.eventHistory.set(key, history);
    }

    history.push(event);

    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  private broadcastEvent(event: NovaEvent) {
    try {
      streamManager.broadcastToSubscribers(`${event.chain}:${event.symbol}`, event);
      logger.info(`Broadcasted ${event.type} event for ${event.symbol} on ${event.chain}`);
    } catch (error) {
      logger.error('Error broadcasting event:', error);
    }
  }

  getEventHistory(symbol: string, chain: string, limit: number = 50): NovaEvent[] {
    const key = `${chain}:${symbol}`;
    const history = this.eventHistory.get(key) || [];
    return history.slice(-limit);
  }

  clearEventHistory(symbol: string, chain: string) {
    const key = `${chain}:${symbol}`;
    this.eventHistory.delete(key);
  }
}

export const eventProcessor = new EventProcessor();
