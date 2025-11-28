import { PredictionData, TrendData, VolatilityData, TokenData, WhaleTransaction } from '../types';
import { logger } from '../../utils/logger';

class PredictionEngine {
  generatePrediction(
    symbol: string,
    chain: string,
    trendData: TrendData,
    volatilityData: VolatilityData | null,
    tokenData: TokenData | null,
    whaleActivity: WhaleTransaction[]
  ): PredictionData {
    const momentum = this.calculateMomentum(trendData, tokenData);
    const whaleSignal = this.analyzeWhaleSignal(whaleActivity);
    const volatilityFactor = this.analyzeVolatilityFactor(volatilityData);

    const prediction = this.determinePrediction(momentum, whaleSignal, volatilityFactor, trendData);
    const confidence = this.calculateConfidence(momentum, whaleSignal, volatilityFactor, trendData);
    const targetPrice = this.calculateTargetPrice(tokenData, prediction, confidence);
    const reasoning = this.generateReasoning(
      prediction,
      momentum,
      whaleSignal,
      volatilityFactor,
      trendData
    );

    const predictionData: PredictionData = {
      symbol,
      chain,
      prediction,
      confidence,
      targetPrice,
      timeframe: '24h',
      reasoning,
      timestamp: new Date(),
    };

    logger.info(
      `Prediction generated for ${symbol} on ${chain}: ${prediction} (confidence: ${confidence}%)`
    );

    return predictionData;
  }

  private calculateMomentum(trendData: TrendData, tokenData: TokenData | null): number {
    if (!tokenData) return 0;

    const trendMomentum = trendData.strength;
    const priceChangeMomentum = tokenData.change24h * 5;

    const momentum = (trendMomentum + priceChangeMomentum) / 2;

    return Math.min(Math.max(momentum, -100), 100);
  }

  private analyzeWhaleSignal(whaleActivity: WhaleTransaction[]): 'bullish' | 'bearish' | 'neutral' {
    if (whaleActivity.length === 0) return 'neutral';

    const recentWhales = whaleActivity.slice(-10);
    const buyCount = recentWhales.filter((w) => w.direction === 'buy').length;
    const sellCount = recentWhales.filter((w) => w.direction === 'sell').length;

    const highImpactBuys = recentWhales.filter(
      (w) => w.direction === 'buy' && w.impact === 'high'
    ).length;
    const highImpactSells = recentWhales.filter(
      (w) => w.direction === 'sell' && w.impact === 'high'
    ).length;

    const buyScore = buyCount + highImpactBuys * 2;
    const sellScore = sellCount + highImpactSells * 2;

    if (buyScore > sellScore * 1.3) return 'bullish';
    if (sellScore > buyScore * 1.3) return 'bearish';
    return 'neutral';
  }

  private analyzeVolatilityFactor(volatilityData: VolatilityData | null): number {
    if (!volatilityData) return 1;

    const { volatilityIndex, severity } = volatilityData;

    const severityMultiplier = {
      low: 0.8,
      medium: 1.0,
      high: 1.2,
      extreme: 1.5,
    };

    return severityMultiplier[severity];
  }

  private determinePrediction(
    momentum: number,
    whaleSignal: 'bullish' | 'bearish' | 'neutral',
    volatilityFactor: number,
    trendData: TrendData
  ): 'bullish' | 'bearish' | 'neutral' {
    let score = 0;

    if (momentum > 20) score += 2;
    else if (momentum > 10) score += 1;
    else if (momentum < -20) score -= 2;
    else if (momentum < -10) score -= 1;

    if (whaleSignal === 'bullish') score += 2;
    else if (whaleSignal === 'bearish') score -= 2;

    if (trendData.trend === 'bullish' && trendData.strength > 60) score += 2;
    else if (trendData.trend === 'bearish' && trendData.strength > 60) score -= 2;
    else if (trendData.trend === 'bullish') score += 1;
    else if (trendData.trend === 'bearish') score -= 1;

    if (volatilityFactor > 1.2) {
      score = Math.round(score * 0.8);
    }

    if (score > 2) return 'bullish';
    if (score < -2) return 'bearish';
    return 'neutral';
  }

  private calculateConfidence(
    momentum: number,
    whaleSignal: 'bullish' | 'bearish' | 'neutral',
    volatilityFactor: number,
    trendData: TrendData
  ): number {
    let confidence = 50;

    const momentumStrength = Math.abs(momentum);
    confidence += Math.min(momentumStrength / 2, 20);

    if (whaleSignal !== 'neutral') {
      confidence += 10;
    }

    if (trendData.strength > 70) {
      confidence += 15;
    } else if (trendData.strength > 50) {
      confidence += 10;
    }

    if (volatilityFactor > 1.2) {
      confidence -= 15;
    } else if (volatilityFactor < 0.9) {
      confidence += 5;
    }

    return Math.min(Math.max(Math.round(confidence), 0), 100);
  }

  private calculateTargetPrice(
    tokenData: TokenData | null,
    prediction: 'bullish' | 'bearish' | 'neutral',
    confidence: number
  ): number {
    if (!tokenData) return 0;

    const currentPrice = tokenData.price;
    const confidenceFactor = confidence / 100;

    let priceChange = 0;

    if (prediction === 'bullish') {
      priceChange = currentPrice * 0.05 * confidenceFactor;
    } else if (prediction === 'bearish') {
      priceChange = -currentPrice * 0.05 * confidenceFactor;
    }

    return currentPrice + priceChange;
  }

  private generateReasoning(
    prediction: 'bullish' | 'bearish' | 'neutral',
    momentum: number,
    whaleSignal: 'bullish' | 'bearish' | 'neutral',
    volatilityFactor: number,
    trendData: TrendData
  ): string {
    const reasons: string[] = [];

    if (trendData.trend === prediction && trendData.strength > 60) {
      reasons.push(`Strong ${trendData.trend} trend with ${trendData.strength}% strength`);
    }

    if (Math.abs(momentum) > 20) {
      reasons.push(`${momentum > 0 ? 'Positive' : 'Negative'} momentum at ${Math.abs(momentum).toFixed(1)}`);
    }

    if (whaleSignal !== 'neutral') {
      reasons.push(`Whale activity shows ${whaleSignal} sentiment`);
    }

    if (volatilityFactor > 1.2) {
      reasons.push('High volatility increases uncertainty');
    } else if (volatilityFactor < 0.9) {
      reasons.push('Low volatility supports stable prediction');
    }

    if (reasons.length === 0) {
      return 'Market conditions are neutral with no strong directional signals';
    }

    return reasons.join('. ') + '.';
  }
}

export const predictionEngine = new PredictionEngine();
