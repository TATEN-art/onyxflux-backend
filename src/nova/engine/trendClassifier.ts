import { TrendData, TokenData, LiquidityData, WhaleTransaction, VolatilityData } from '../types';
import { logger } from '../../utils/logger';

class TrendClassifier {
  classifyTrend(
    symbol: string,
    chain: string,
    tokenData: TokenData | null,
    liquidityData: LiquidityData | null,
    volatilityData: VolatilityData | null,
    whaleActivity: WhaleTransaction[]
  ): TrendData {
    if (!tokenData) {
      return {
        symbol,
        chain,
        trend: 'neutral',
        strength: 0,
        timeframe: '24h',
        timestamp: new Date(),
      };
    }

    const priceDirection = this.analyzePriceDirection(tokenData);
    const volumeSignal = this.analyzeVolume(tokenData);
    const whaleSignal = this.analyzeWhaleActivity(whaleActivity);
    const liquiditySignal = this.analyzeLiquidity(liquidityData);
    const volatilitySignal = this.analyzeVolatility(volatilityData);

    const trend = this.determineTrend(
      priceDirection,
      volumeSignal,
      whaleSignal,
      liquiditySignal,
      volatilitySignal
    );

    const strength = this.calculateTrendStrength(
      priceDirection,
      volumeSignal,
      whaleSignal,
      liquiditySignal,
      volatilitySignal
    );

    const trendData: TrendData = {
      symbol,
      chain,
      trend,
      strength,
      timeframe: '24h',
      timestamp: new Date(),
    };

    logger.info(`Trend classified for ${symbol} on ${chain}: ${trend} (strength: ${strength})`);

    return trendData;
  }

  private analyzePriceDirection(tokenData: TokenData): 'up' | 'down' | 'sideways' {
    const { change24h } = tokenData;

    if (change24h > 3) return 'up';
    if (change24h < -3) return 'down';
    return 'sideways';
  }

  private analyzeVolume(tokenData: TokenData): 'high' | 'medium' | 'low' {
    const { volume24h } = tokenData;

    if (volume24h > 1000000) return 'high';
    if (volume24h > 100000) return 'medium';
    return 'low';
  }

  private analyzeWhaleActivity(whaleActivity: WhaleTransaction[]): 'accumulating' | 'distributing' | 'neutral' {
    if (whaleActivity.length === 0) return 'neutral';

    const recentWhales = whaleActivity.slice(-10);
    const buyCount = recentWhales.filter((w) => w.direction === 'buy').length;
    const sellCount = recentWhales.filter((w) => w.direction === 'sell').length;

    if (buyCount > sellCount * 1.5) return 'accumulating';
    if (sellCount > buyCount * 1.5) return 'distributing';
    return 'neutral';
  }

  private analyzeLiquidity(liquidityData: LiquidityData | null): 'increasing' | 'decreasing' | 'stable' {
    if (!liquidityData) return 'stable';

    const { direction, liquidityChange } = liquidityData;

    if (liquidityChange < 2) return 'stable';

    return direction === 'increase' ? 'increasing' : 'decreasing';
  }

  private analyzeVolatility(volatilityData: VolatilityData | null): 'high' | 'medium' | 'low' {
    if (!volatilityData) return 'medium';

    const { volatilityIndex } = volatilityData;

    if (volatilityIndex > 5) return 'high';
    if (volatilityIndex > 2) return 'medium';
    return 'low';
  }

  private determineTrend(
    priceDirection: 'up' | 'down' | 'sideways',
    volumeSignal: 'high' | 'medium' | 'low',
    whaleSignal: 'accumulating' | 'distributing' | 'neutral',
    liquiditySignal: 'increasing' | 'decreasing' | 'stable',
    volatilitySignal: 'high' | 'medium' | 'low'
  ): 'bullish' | 'bearish' | 'neutral' {
    let bullishScore = 0;
    let bearishScore = 0;

    if (priceDirection === 'up') bullishScore += 3;
    if (priceDirection === 'down') bearishScore += 3;

    if (volumeSignal === 'high') {
      if (priceDirection === 'up') bullishScore += 2;
      if (priceDirection === 'down') bearishScore += 2;
    }

    if (whaleSignal === 'accumulating') bullishScore += 2;
    if (whaleSignal === 'distributing') bearishScore += 2;

    if (liquiditySignal === 'increasing') bullishScore += 1;
    if (liquiditySignal === 'decreasing') bearishScore += 1;

    if (volatilitySignal === 'high' && priceDirection === 'up') {
      bullishScore += 1;
    }

    if (Math.abs(bullishScore - bearishScore) < 2) {
      return 'neutral';
    }

    return bullishScore > bearishScore ? 'bullish' : 'bearish';
  }

  private calculateTrendStrength(
    priceDirection: 'up' | 'down' | 'sideways',
    volumeSignal: 'high' | 'medium' | 'low',
    whaleSignal: 'accumulating' | 'distributing' | 'neutral',
    liquiditySignal: 'increasing' | 'decreasing' | 'stable',
    volatilitySignal: 'high' | 'medium' | 'low'
  ): number {
    let strength = 0;

    if (priceDirection !== 'sideways') strength += 30;

    const volumeStrength = {
      high: 25,
      medium: 15,
      low: 5,
    };
    strength += volumeStrength[volumeSignal];

    if (whaleSignal !== 'neutral') strength += 20;

    if (liquiditySignal !== 'stable') strength += 15;

    if (volatilitySignal === 'high') strength += 10;

    return Math.min(Math.max(strength, 0), 100);
  }

  detectBreakout(
    symbol: string,
    chain: string,
    volatilityData: VolatilityData | null,
    liquidityData: LiquidityData | null
  ): 'breakout_watch' | 'no_breakout' {
    if (!volatilityData || !liquidityData) return 'no_breakout';

    const isVolatilitySpike = volatilityData.severity === 'high' || volatilityData.severity === 'extreme';
    const isLiquidityAccumulating = liquidityData.direction === 'increase' && liquidityData.severity !== 'low';

    if (isVolatilitySpike && isLiquidityAccumulating) {
      logger.info(`Breakout watch detected for ${symbol} on ${chain}`);
      return 'breakout_watch';
    }

    return 'no_breakout';
  }
}

export const trendClassifier = new TrendClassifier();
