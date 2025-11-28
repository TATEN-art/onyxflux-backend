import {
  BotStrategy,
  BotRiskLevel,
  BotSignalType,
  BotEvaluationResult,
  NovaSignalData,
  RISK_LEVEL_CONFIG,
} from './types';
import { priceFeedService } from '../nova/ingestion/priceFeed';
import { liquidityFeedService } from '../nova/ingestion/liquidityFeed';
import { whaleFeedService } from '../nova/ingestion/whaleFeed';
import { volatilityFeedService } from '../nova/ingestion/volatilityFeed';
import { trendClassifier } from '../nova/engine/trendClassifier';
import { riskScoreEngine } from '../nova/engine/riskScore';
import { predictionEngine } from '../nova/engine/prediction';
import { logger } from '../utils/logger';

class BotEngine {
  async evaluateBot(
    botId: string,
    chain: 'ethereum' | 'base',
    tokenAddress: string,
    tokenSymbol: string,
    strategy: BotStrategy,
    riskLevel: BotRiskLevel
  ): Promise<BotEvaluationResult> {
    try {
      logger.info(`Evaluating bot ${botId} for ${tokenSymbol} on ${chain}`);

      const [tokenData, whaleActivity] = await Promise.all([
        priceFeedService.getTokenPrice(tokenAddress, chain),
        whaleFeedService.getWhaleActivity(tokenAddress, chain, 60),
      ]);

      if (!tokenData) {
        throw new Error(`Unable to fetch token data for ${tokenAddress}`);
      }

      const poolAddress = `${tokenAddress}:pool`;
      const liquidityData = await liquidityFeedService.getPoolLiquidity(
        poolAddress,
        tokenSymbol,
        chain
      );

      volatilityFeedService.addPricePoint(tokenSymbol, chain, tokenData.price);
      const volatilityData = volatilityFeedService.calculateVolatility(tokenSymbol, chain);

      const trendData = trendClassifier.classifyTrend(
        tokenSymbol,
        chain,
        tokenData,
        liquidityData,
        volatilityData,
        whaleActivity
      );

      const riskData = riskScoreEngine.calculateRiskScore(
        tokenSymbol,
        chain,
        tokenData,
        liquidityData,
        volatilityData,
        whaleActivity
      );

      const predictionData = predictionEngine.generatePrediction(
        tokenSymbol,
        chain,
        trendData,
        volatilityData,
        tokenData,
        whaleActivity
      );

      const novaData: NovaSignalData = {
        trend: trendData.trend,
        trendStrength: trendData.strength,
        riskScore: riskData.riskScore,
        volatilityIndex: volatilityData?.volatilityIndex || 0,
        liquidityDirection: liquidityData?.direction || 'stable',
        whaleActivity: this.determineWhaleActivity(whaleActivity),
        marketSentiment: this.determineMarketSentiment(tokenData.change24h),
        prediction: predictionData.prediction,
        predictionConfidence: predictionData.confidence,
        targetPrice: predictionData.targetPrice,
      };

      const evaluation = this.generateSignal(
        strategy,
        riskLevel,
        tokenData.price,
        novaData
      );

      logger.info(`Bot ${botId} evaluation complete: ${evaluation.signal} signal with ${evaluation.confidence}% confidence`);

      return evaluation;
    } catch (error) {
      logger.error(`Error evaluating bot ${botId}:`, error);
      throw error;
    }
  }

  private generateSignal(
    strategy: BotStrategy,
    riskLevel: BotRiskLevel,
    currentPrice: number,
    novaData: NovaSignalData
  ): BotEvaluationResult {
    const riskConfig = RISK_LEVEL_CONFIG[riskLevel];

    let signal: BotSignalType = 'hold';
    let confidence = 0;
    let reasoning = '';

    switch (strategy) {
      case 'trend_following':
        ({ signal, confidence, reasoning } = this.trendFollowingStrategy(novaData, riskConfig));
        break;
      case 'breakout':
        ({ signal, confidence, reasoning } = this.breakoutStrategy(novaData, riskConfig));
        break;
      case 'scalping':
        ({ signal, confidence, reasoning } = this.scalpingStrategy(novaData, riskConfig));
        break;
      case 'momentum':
        ({ signal, confidence, reasoning } = this.momentumStrategy(novaData, riskConfig));
        break;
      case 'reversal':
        ({ signal, confidence, reasoning } = this.reversalStrategy(novaData, riskConfig));
        break;
      case 'whale_tracking':
        ({ signal, confidence, reasoning } = this.whaleTrackingStrategy(novaData, riskConfig));
        break;
      case 'sideways_accumulation':
        ({ signal, confidence, reasoning } = this.sidewaysAccumulationStrategy(novaData, riskConfig));
        break;
    }

    if (confidence < riskConfig.minConfidence) {
      signal = 'hold';
      reasoning += ` Confidence ${confidence}% below minimum threshold ${riskConfig.minConfidence}%.`;
    }

    const entryPrice = signal === 'buy' ? currentPrice : null;
    const exitPrice = signal === 'sell' ? currentPrice : null;
    const stopLoss = signal === 'buy' ? currentPrice * (1 - riskConfig.stopLossPercentage / 100) : null;
    const takeProfit = signal === 'buy' ? currentPrice * (1 + riskConfig.takeProfitPercentage / 100) : null;
    const capitalAllocation = signal === 'buy' ? riskConfig.maxCapitalAllocation : 0;

    return {
      signal,
      confidence,
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      capitalAllocation,
      reasoning,
      novaData,
    };
  }

  private trendFollowingStrategy(
    novaData: NovaSignalData,
    riskConfig: any
  ): { signal: BotSignalType; confidence: number; reasoning: string } {
    let signal: BotSignalType = 'hold';
    let confidence = 50;
    let reasoning = 'Trend Following: ';

    if (novaData.trend === 'bullish' && novaData.trendStrength > 60) {
      signal = 'buy';
      confidence = Math.min(novaData.trendStrength + novaData.predictionConfidence / 2, 95);
      reasoning += `Strong bullish trend (${novaData.trendStrength}%) with ${novaData.prediction} prediction (${novaData.predictionConfidence}% confidence).`;
    } else if (novaData.trend === 'bearish' && novaData.trendStrength > 60) {
      signal = 'sell';
      confidence = Math.min(novaData.trendStrength + 10, 85);
      reasoning += `Strong bearish trend (${novaData.trendStrength}%) detected.`;
    } else {
      reasoning += `Trend not strong enough (${novaData.trend} at ${novaData.trendStrength}%).`;
    }

    return { signal, confidence, reasoning };
  }

  private breakoutStrategy(
    novaData: NovaSignalData,
    riskConfig: any
  ): { signal: BotSignalType; confidence: number; reasoning: string } {
    let signal: BotSignalType = 'hold';
    let confidence = 50;
    let reasoning = 'Breakout: ';

    if (
      novaData.volatilityIndex > 50 &&
      novaData.liquidityDirection === 'increasing' &&
      novaData.trend === 'bullish'
    ) {
      signal = 'buy';
      confidence = Math.min(70 + novaData.volatilityIndex / 3, 90);
      reasoning += `Volatility spike (${novaData.volatilityIndex}) with increasing liquidity and bullish trend.`;
    } else if (novaData.volatilityIndex > 70 && novaData.trend === 'bearish') {
      signal = 'sell';
      confidence = 75;
      reasoning += `High volatility (${novaData.volatilityIndex}) with bearish trend suggests breakdown.`;
    } else {
      reasoning += `No clear breakout pattern detected.`;
    }

    return { signal, confidence, reasoning };
  }

  private scalpingStrategy(
    novaData: NovaSignalData,
    riskConfig: any
  ): { signal: BotSignalType; confidence: number; reasoning: string } {
    let signal: BotSignalType = 'hold';
    let confidence = 50;
    let reasoning = 'Scalping: ';

    if (
      novaData.volatilityIndex > 30 &&
      novaData.volatilityIndex < 60 &&
      novaData.riskScore < 50
    ) {
      if (novaData.prediction === 'bullish' && novaData.predictionConfidence > 60) {
        signal = 'buy';
        confidence = novaData.predictionConfidence;
        reasoning += `Moderate volatility (${novaData.volatilityIndex}) with bullish prediction for quick trade.`;
      } else if (novaData.prediction === 'bearish' && novaData.predictionConfidence > 60) {
        signal = 'sell';
        confidence = novaData.predictionConfidence;
        reasoning += `Moderate volatility with bearish prediction for quick exit.`;
      }
    } else {
      reasoning += `Volatility (${novaData.volatilityIndex}) or risk (${novaData.riskScore}) outside scalping range.`;
    }

    return { signal, confidence, reasoning };
  }

  private momentumStrategy(
    novaData: NovaSignalData,
    riskConfig: any
  ): { signal: BotSignalType; confidence: number; reasoning: string } {
    let signal: BotSignalType = 'hold';
    let confidence = 50;
    let reasoning = 'Momentum: ';

    if (
      novaData.trendStrength > 70 &&
      novaData.whaleActivity === 'accumulating' &&
      novaData.marketSentiment === 'bullish'
    ) {
      signal = 'buy';
      confidence = Math.min(novaData.trendStrength + 15, 95);
      reasoning += `Strong momentum (${novaData.trendStrength}%) with whale accumulation and bullish sentiment.`;
    } else if (
      novaData.trendStrength > 60 &&
      novaData.whaleActivity === 'distributing'
    ) {
      signal = 'sell';
      confidence = 80;
      reasoning += `Strong momentum but whales distributing suggests reversal.`;
    } else {
      reasoning += `Insufficient momentum signals.`;
    }

    return { signal, confidence, reasoning };
  }

  private reversalStrategy(
    novaData: NovaSignalData,
    riskConfig: any
  ): { signal: BotSignalType; confidence: number; reasoning: string } {
    let signal: BotSignalType = 'hold';
    let confidence = 50;
    let reasoning = 'Reversal: ';

    if (
      novaData.trend === 'bearish' &&
      novaData.volatilityIndex > 60 &&
      novaData.whaleActivity === 'accumulating' &&
      novaData.prediction === 'bullish'
    ) {
      signal = 'buy';
      confidence = Math.min(novaData.predictionConfidence + 10, 85);
      reasoning += `Bearish trend with whale accumulation and bullish prediction suggests reversal.`;
    } else if (
      novaData.trend === 'bullish' &&
      novaData.whaleActivity === 'distributing' &&
      novaData.prediction === 'bearish'
    ) {
      signal = 'sell';
      confidence = 75;
      reasoning += `Bullish trend with whale distribution suggests top formation.`;
    } else {
      reasoning += `No clear reversal signals detected.`;
    }

    return { signal, confidence, reasoning };
  }

  private whaleTrackingStrategy(
    novaData: NovaSignalData,
    riskConfig: any
  ): { signal: BotSignalType; confidence: number; reasoning: string } {
    let signal: BotSignalType = 'hold';
    let confidence = 50;
    let reasoning = 'Whale Tracking: ';

    if (novaData.whaleActivity === 'accumulating' && novaData.riskScore < 60) {
      signal = 'buy';
      confidence = 80;
      reasoning += `Whales accumulating with acceptable risk (${novaData.riskScore}).`;
    } else if (novaData.whaleActivity === 'distributing') {
      signal = 'sell';
      confidence = 85;
      reasoning += `Whales distributing - follow smart money exit.`;
    } else {
      reasoning += `No significant whale activity detected.`;
    }

    return { signal, confidence, reasoning };
  }

  private sidewaysAccumulationStrategy(
    novaData: NovaSignalData,
    riskConfig: any
  ): { signal: BotSignalType; confidence: number; reasoning: string } {
    let signal: BotSignalType = 'hold';
    let confidence = 50;
    let reasoning = 'Sideways Accumulation: ';

    if (
      novaData.trend === 'neutral' &&
      novaData.volatilityIndex < 40 &&
      novaData.liquidityDirection === 'increasing' &&
      novaData.riskScore < 50
    ) {
      signal = 'buy';
      confidence = 70;
      reasoning += `Low volatility (${novaData.volatilityIndex}) sideways market with increasing liquidity - accumulation zone.`;
    } else if (novaData.volatilityIndex > 60) {
      signal = 'hold';
      confidence = 60;
      reasoning += `Volatility too high (${novaData.volatilityIndex}) for accumulation strategy.`;
    } else {
      reasoning += `Market conditions not suitable for accumulation.`;
    }

    return { signal, confidence, reasoning };
  }

  private determineWhaleActivity(whaleTransactions: any[]): string {
    if (whaleTransactions.length === 0) return 'neutral';

    const recentWhales = whaleTransactions.slice(-10);
    const buyCount = recentWhales.filter((w) => w.direction === 'buy').length;
    const sellCount = recentWhales.filter((w) => w.direction === 'sell').length;

    if (buyCount > sellCount * 1.5) return 'accumulating';
    if (sellCount > buyCount * 1.5) return 'distributing';
    return 'neutral';
  }

  private determineMarketSentiment(change24h: number): string {
    if (change24h > 5) return 'bullish';
    if (change24h < -5) return 'bearish';
    return 'neutral';
  }
}

export const botEngine = new BotEngine();
