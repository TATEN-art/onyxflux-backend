import { Logger } from '../utils/logger';
import { NovaV2Prediction } from './nova.engine';
import { StrategyRecommendation } from './nova.strategy';

const logger = new Logger('NovaSignalsV2');

export type SignalType = 'BUY' | 'SELL' | 'HOLD';
export type SignalStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';

export interface TradingSignal {
  signal: SignalType;
  strength: SignalStrength;
  confidence: number;
  price: number;
  timestamp: number;
  timeframe: string;
  reasoning: string[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];
  riskRewardRatio?: number;
}

export class NovaSignalsV2 {
  /**
   * Generate trading signals based on Nova V2 prediction and strategy
   */
  generateSignal(
    prediction: NovaV2Prediction,
    strategy: StrategyRecommendation,
    currentPrice: number,
    timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '24h' = '15m'
  ): TradingSignal {
    logger.info(`Generating signal for ${timeframe} timeframe`);
    
    const direction = this.getDirectionForTimeframe(prediction, timeframe);
    const confidence = this.getConfidenceForTimeframe(prediction, timeframe);
    
    const signal = this.determineSignalType(direction, confidence, prediction);
    
    const strength = this.determineSignalStrength(confidence, prediction);
    
    const reasoning = this.generateSignalReasoning(
      signal,
      strength,
      direction,
      prediction,
      strategy,
      timeframe
    );
    
    const riskRewardRatio = this.calculateRiskReward(
      currentPrice,
      strategy.stopLoss,
      strategy.takeProfit[0]
    );
    
    return {
      signal,
      strength,
      confidence,
      price: currentPrice,
      timestamp: Date.now(),
      timeframe,
      reasoning,
      entryPrice: signal !== 'HOLD' ? strategy.entryPoints[0] : undefined,
      stopLoss: signal !== 'HOLD' ? strategy.stopLoss : undefined,
      takeProfit: signal !== 'HOLD' ? strategy.takeProfit : undefined,
      riskRewardRatio: signal !== 'HOLD' ? riskRewardRatio : undefined,
    };
  }
  
  /**
   * Generate multiple signals for all timeframes
   */
  generateMultiTimeframeSignals(
    prediction: NovaV2Prediction,
    strategy: StrategyRecommendation,
    currentPrice: number
  ): Record<string, TradingSignal> {
    return {
      '1m': this.generateSignal(prediction, strategy, currentPrice, '1m'),
      '5m': this.generateSignal(prediction, strategy, currentPrice, '5m'),
      '15m': this.generateSignal(prediction, strategy, currentPrice, '15m'),
      '1h': this.generateSignal(prediction, strategy, currentPrice, '1h'),
      '4h': this.generateSignal(prediction, strategy, currentPrice, '4h'),
      '24h': this.generateSignal(prediction, strategy, currentPrice, '24h'),
    };
  }
  
  /**
   * Get direction for specific timeframe
   */
  private getDirectionForTimeframe(
    prediction: NovaV2Prediction,
    timeframe: string
  ): 'UP' | 'DOWN' | 'SIDEWAYS' {
    switch (timeframe) {
      case '1m': return prediction.direction_1m;
      case '5m': return prediction.direction_5m;
      case '15m': return prediction.direction_15m;
      case '1h': return prediction.direction_1h;
      case '4h': return prediction.direction_1h; // Use 1h as proxy
      case '24h': return prediction.direction_24h;
      default: return prediction.direction_15m;
    }
  }
  
  /**
   * Get confidence for specific timeframe
   */
  private getConfidenceForTimeframe(
    prediction: NovaV2Prediction,
    timeframe: string
  ): number {
    switch (timeframe) {
      case '1m': return prediction.confidence_1m;
      case '5m': return prediction.confidence_5m;
      case '15m': return prediction.confidence_15m;
      case '1h': return prediction.confidence_1h;
      case '4h': return prediction.confidence_1h * 0.95; // Slightly lower for longer timeframe
      case '24h': return prediction.confidence_24h;
      default: return prediction.confidence_15m;
    }
  }
  
  /**
   * Determine signal type (BUY/SELL/HOLD)
   */
  private determineSignalType(
    direction: 'UP' | 'DOWN' | 'SIDEWAYS',
    confidence: number,
    prediction: NovaV2Prediction
  ): SignalType {
    const MIN_CONFIDENCE = 0.55;
    
    if (confidence < MIN_CONFIDENCE) {
      return 'HOLD';
    }
    
    if (direction === 'UP') {
      if (prediction.whaleDeltaScore > 0.2 && confidence > 0.65) {
        return 'BUY';
      }
      if (prediction.trendScore > 0.01 && confidence > 0.60) {
        return 'BUY';
      }
      if (prediction.liquidityShiftScore > 0.1 && confidence > 0.60) {
        return 'BUY';
      }
      if (confidence > 0.60) {
        return 'BUY';
      }
    }
    
    if (direction === 'DOWN') {
      if (prediction.whaleDeltaScore < -0.2 && confidence > 0.65) {
        return 'SELL';
      }
      if (prediction.trendScore < -0.01 && confidence > 0.60) {
        return 'SELL';
      }
      if (prediction.liquidityShiftScore < -0.1 && confidence > 0.60) {
        return 'SELL';
      }
      if (confidence > 0.60) {
        return 'SELL';
      }
    }
    
    return 'HOLD';
  }
  
  /**
   * Determine signal strength
   */
  private determineSignalStrength(
    confidence: number,
    prediction: NovaV2Prediction
  ): SignalStrength {
    let strengthScore = confidence;
    
    if (Math.abs(prediction.whaleDeltaScore) > 0.3) {
      strengthScore += 0.10;
    }
    
    if (Math.abs(prediction.trendScore) > 0.02) {
      strengthScore += 0.08;
    }
    
    if (prediction.aiEnhancedScore > 0.7) {
      strengthScore += 0.05;
    }
    
    if (prediction.volatilityScore > 0.10) {
      strengthScore -= 0.05;
    }
    
    if (strengthScore >= 0.80) return 'VERY_STRONG';
    if (strengthScore >= 0.70) return 'STRONG';
    if (strengthScore >= 0.60) return 'MODERATE';
    return 'WEAK';
  }
  
  /**
   * Generate signal reasoning
   */
  private generateSignalReasoning(
    signal: SignalType,
    strength: SignalStrength,
    direction: 'UP' | 'DOWN' | 'SIDEWAYS',
    prediction: NovaV2Prediction,
    strategy: StrategyRecommendation,
    timeframe: string
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`${strength} ${signal} signal generated for ${timeframe} timeframe`);
    reasoning.push(`Direction: ${direction} with ${(prediction.overallConfidence * 100).toFixed(0)}% confidence`);
    
    reasoning.push(`Strategy: ${strategy.strategyType} (${strategy.riskLevel} risk)`);
    
    if (signal === 'BUY') {
      if (prediction.whaleDeltaScore > 0.2) {
        reasoning.push('✓ Strong whale accumulation detected');
      }
      if (prediction.trendScore > 0.01) {
        reasoning.push('✓ Bullish trend confirmed');
      }
      if (prediction.liquidityShiftScore > 0.1) {
        reasoning.push('✓ Liquidity influx supporting upward movement');
      }
      if (prediction.aiEnhancedScore > 0.7) {
        reasoning.push('✓ AI models show high bullish probability');
      }
    } else if (signal === 'SELL') {
      if (prediction.whaleDeltaScore < -0.2) {
        reasoning.push('✓ Heavy whale distribution detected');
      }
      if (prediction.trendScore < -0.01) {
        reasoning.push('✓ Bearish trend confirmed');
      }
      if (prediction.liquidityShiftScore < -0.1) {
        reasoning.push('✓ Liquidity drain creating downward pressure');
      }
      if (prediction.aiEnhancedScore < 0.3) {
        reasoning.push('✓ AI models show high bearish probability');
      }
    } else {
      reasoning.push('⚠ Insufficient confidence or unclear market direction');
      reasoning.push('⚠ Wait for better setup before entering position');
    }
    
    if (prediction.volatilityScore > 0.10) {
      reasoning.push('⚠ High volatility - use reduced position sizing');
    }
    
    if (prediction.overallConfidence < 0.65) {
      reasoning.push('⚠ Moderate confidence - consider waiting for confirmation');
    }
    
    return reasoning;
  }
  
  /**
   * Calculate risk/reward ratio
   */
  private calculateRiskReward(
    entryPrice: number,
    stopLoss: number,
    takeProfit: number
  ): number {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    
    if (risk === 0) return 0;
    
    return reward / risk;
  }
  
  /**
   * Check if signal should be executed based on market conditions
   */
  shouldExecuteSignal(
    signal: TradingSignal,
    currentPrice: number,
    minConfidence: number = 0.60,
    minRiskReward: number = 1.5
  ): { execute: boolean; reason: string } {
    if (signal.confidence < minConfidence) {
      return {
        execute: false,
        reason: `Confidence ${(signal.confidence * 100).toFixed(0)}% below minimum ${(minConfidence * 100).toFixed(0)}%`,
      };
    }
    
    if (signal.riskRewardRatio && signal.riskRewardRatio < minRiskReward) {
      return {
        execute: false,
        reason: `Risk/reward ratio ${signal.riskRewardRatio.toFixed(2)} below minimum ${minRiskReward}`,
      };
    }
    
    if (signal.signal === 'HOLD') {
      return {
        execute: false,
        reason: 'Signal is HOLD - no action recommended',
      };
    }
    
    if (signal.entryPrice) {
      const priceDeviation = Math.abs(signal.entryPrice - currentPrice) / currentPrice;
      if (priceDeviation > 0.05) { // More than 5% away
        return {
          execute: false,
          reason: `Entry price ${signal.entryPrice.toFixed(4)} too far from current price ${currentPrice.toFixed(4)}`,
        };
      }
    }
    
    return {
      execute: true,
      reason: `${signal.strength} ${signal.signal} signal with ${(signal.confidence * 100).toFixed(0)}% confidence`,
    };
  }
}
