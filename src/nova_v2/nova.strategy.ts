import { Logger } from '../utils/logger';
import { NovaV2Prediction } from './nova.engine';

const logger = new Logger('NovaStrategyV2');

export interface StrategyRecommendation {
  strategyType: 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following';
  entryPoints: number[];
  exitPoints: number[];
  stopLoss: number;
  takeProfit: number[];
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string[];
  confidence: number;
}

export class NovaStrategyV2 {
  /**
   * Select optimal strategy based on Nova V2 prediction
   */
  selectStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    userRiskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    logger.info(`Selecting strategy for ${prediction.strategyType} with ${userRiskTolerance} risk tolerance`);
    
    switch (prediction.strategyType) {
      case 'Breakout':
        return this.breakoutStrategy(prediction, currentPrice, userRiskTolerance);
      
      case 'Scalper':
        return this.scalperStrategy(prediction, currentPrice, userRiskTolerance);
      
      case 'Whale Momentum':
        return this.whaleMomentumStrategy(prediction, currentPrice, userRiskTolerance);
      
      case 'Swing':
        return this.swingStrategy(prediction, currentPrice, userRiskTolerance);
      
      case 'Range Trading':
        return this.rangeTradingStrategy(prediction, currentPrice, userRiskTolerance);
      
      case 'Trend Following':
        return this.trendFollowingStrategy(prediction, currentPrice, userRiskTolerance);
      
      default:
        return this.defaultStrategy(prediction, currentPrice, userRiskTolerance);
    }
  }
  
  /**
   * Breakout strategy
   */
  private breakoutStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    const volatilityMultiplier = prediction.volatilityScore * 100;
    
    const entryPoints = [
      currentPrice * (1 + 0.005), // Breakout confirmation
      currentPrice * (1 + 0.010), // Strong breakout
    ];
    
    const stopLossPercent = riskTolerance === 'conservative' ? 0.02 : riskTolerance === 'moderate' ? 0.03 : 0.05;
    const stopLoss = currentPrice * (1 - stopLossPercent);
    
    const takeProfit = [
      currentPrice * (1 + 0.03), // First target
      currentPrice * (1 + 0.05), // Second target
      currentPrice * (1 + 0.08), // Third target
    ];
    
    const exitPoints = [
      currentPrice * (1 - 0.015), // Exit if breakout fails
    ];
    
    const reasoning = [
      'Breakout strategy selected based on high volatility and strong directional movement',
      `Entry recommended on ${prediction.direction_5m} breakout confirmation`,
      `Volatility score: ${(prediction.volatilityScore * 100).toFixed(1)}%`,
      `Stop loss set at ${stopLossPercent * 100}% to manage risk`,
      'Multiple take-profit levels for scaling out of position',
    ];
    
    return {
      strategyType: 'Breakout',
      entryPoints,
      exitPoints,
      stopLoss,
      takeProfit,
      timeframe: '5m-15m',
      riskLevel: 'high',
      reasoning,
      confidence: prediction.confidence_5m,
    };
  }
  
  /**
   * Scalper strategy
   */
  private scalperStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    const entryPoints = [
      currentPrice * (1 + 0.001), // Quick entry
      currentPrice * (1 - 0.001), // Dip entry
    ];
    
    const stopLoss = currentPrice * (1 - 0.005); // Tight stop loss
    
    const takeProfit = [
      currentPrice * (1 + 0.003), // Quick profit target
      currentPrice * (1 + 0.005), // Extended target
    ];
    
    const exitPoints = [
      currentPrice * (1 - 0.003), // Quick exit on reversal
    ];
    
    const reasoning = [
      'Scalping strategy for quick profits in volatile conditions',
      `1-minute prediction: ${prediction.direction_1m}`,
      'Tight stop loss and quick profit targets',
      'High-frequency trading approach',
      `Confidence: ${(prediction.confidence_1m * 100).toFixed(0)}%`,
    ];
    
    return {
      strategyType: 'Scalper',
      entryPoints,
      exitPoints,
      stopLoss,
      takeProfit,
      timeframe: '1m-5m',
      riskLevel: 'medium',
      reasoning,
      confidence: prediction.confidence_1m,
    };
  }
  
  /**
   * Whale Momentum strategy
   */
  private whaleMomentumStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    const whaleDirection = prediction.whaleDeltaScore > 0 ? 'bullish' : 'bearish';
    
    const entryPoints = whaleDirection === 'bullish'
      ? [currentPrice * 1.002, currentPrice * 1.005]
      : [currentPrice * 0.998, currentPrice * 0.995];
    
    const stopLossPercent = riskTolerance === 'conservative' ? 0.025 : riskTolerance === 'moderate' ? 0.035 : 0.05;
    const stopLoss = whaleDirection === 'bullish'
      ? currentPrice * (1 - stopLossPercent)
      : currentPrice * (1 + stopLossPercent);
    
    const takeProfit = whaleDirection === 'bullish'
      ? [currentPrice * 1.04, currentPrice * 1.07, currentPrice * 1.10]
      : [currentPrice * 0.96, currentPrice * 0.93, currentPrice * 0.90];
    
    const exitPoints = [currentPrice]; // Exit at current if whale activity reverses
    
    const reasoning = [
      `Whale Momentum strategy - ${whaleDirection} whale activity detected`,
      `Whale delta score: ${(prediction.whaleDeltaScore * 100).toFixed(1)}%`,
      'Following smart money movements',
      `15-minute outlook: ${prediction.direction_15m}`,
      'Position sizing should account for whale volatility',
    ];
    
    return {
      strategyType: 'Whale Momentum',
      entryPoints,
      exitPoints,
      stopLoss,
      takeProfit,
      timeframe: '15m-1h',
      riskLevel: 'high',
      reasoning,
      confidence: prediction.confidence_15m,
    };
  }
  
  /**
   * Swing strategy
   */
  private swingStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    const trendDirection = prediction.trendScore > 0 ? 'bullish' : 'bearish';
    
    const entryPoints = trendDirection === 'bullish'
      ? [currentPrice * 0.98, currentPrice * 0.96] // Buy dips
      : [currentPrice * 1.02, currentPrice * 1.04]; // Sell rallies
    
    const stopLossPercent = riskTolerance === 'conservative' ? 0.04 : riskTolerance === 'moderate' ? 0.06 : 0.08;
    const stopLoss = trendDirection === 'bullish'
      ? currentPrice * (1 - stopLossPercent)
      : currentPrice * (1 + stopLossPercent);
    
    const takeProfit = trendDirection === 'bullish'
      ? [currentPrice * 1.08, currentPrice * 1.15, currentPrice * 1.25]
      : [currentPrice * 0.92, currentPrice * 0.85, currentPrice * 0.75];
    
    const exitPoints = [currentPrice * (trendDirection === 'bullish' ? 0.95 : 1.05)];
    
    const reasoning = [
      `Swing trading strategy for ${trendDirection} trend`,
      `Trend score: ${(prediction.trendScore * 100).toFixed(2)}%`,
      '4-hour to 24-hour holding period',
      `24-hour prediction: ${prediction.direction_24h}`,
      'Entry on pullbacks for optimal risk/reward',
    ];
    
    return {
      strategyType: 'Swing',
      entryPoints,
      exitPoints,
      stopLoss,
      takeProfit,
      timeframe: '4h-24h',
      riskLevel: 'medium',
      reasoning,
      confidence: prediction.confidence_1h,
    };
  }
  
  /**
   * Range Trading strategy
   */
  private rangeTradingStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    const rangeSize = currentPrice * 0.05; // 5% range
    const rangeTop = currentPrice * 1.025;
    const rangeBottom = currentPrice * 0.975;
    
    const entryPoints = [
      rangeBottom, // Buy at support
      rangeTop, // Sell at resistance
    ];
    
    const stopLoss = currentPrice * 0.96; // Below range
    
    const takeProfit = [
      rangeTop * 0.99, // Near resistance
      rangeTop, // At resistance
    ];
    
    const exitPoints = [
      rangeBottom * 1.01, // Near support
      rangeTop * 0.99, // Near resistance
    ];
    
    const reasoning = [
      'Range trading strategy for sideways market',
      `Market structure score: ${(prediction.marketStructureScore * 100).toFixed(0)}%`,
      'Buy at support, sell at resistance',
      'Low volatility environment ideal for range trading',
      `Confidence: ${(prediction.overallConfidence * 100).toFixed(0)}%`,
    ];
    
    return {
      strategyType: 'Range Trading',
      entryPoints,
      exitPoints,
      stopLoss,
      takeProfit,
      timeframe: '1h-4h',
      riskLevel: 'low',
      reasoning,
      confidence: prediction.overallConfidence,
    };
  }
  
  /**
   * Trend Following strategy
   */
  private trendFollowingStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    const trendDirection = prediction.trendScore > 0 ? 'bullish' : 'bearish';
    
    const entryPoints = trendDirection === 'bullish'
      ? [currentPrice * 1.01, currentPrice * 1.02]
      : [currentPrice * 0.99, currentPrice * 0.98];
    
    const stopLossPercent = riskTolerance === 'conservative' ? 0.03 : riskTolerance === 'moderate' ? 0.05 : 0.07;
    const stopLoss = trendDirection === 'bullish'
      ? currentPrice * (1 - stopLossPercent)
      : currentPrice * (1 + stopLossPercent);
    
    const takeProfit = trendDirection === 'bullish'
      ? [currentPrice * 1.10, currentPrice * 1.20, currentPrice * 1.35]
      : [currentPrice * 0.90, currentPrice * 0.80, currentPrice * 0.65];
    
    const exitPoints = [currentPrice * (trendDirection === 'bullish' ? 0.97 : 1.03)];
    
    const reasoning = [
      `Trend following strategy - riding the ${trendDirection} trend`,
      `Strong trend score: ${(prediction.trendScore * 100).toFixed(2)}%`,
      'Hold position as long as trend remains intact',
      `1-hour direction: ${prediction.direction_1h}`,
      'Trailing stop loss recommended',
    ];
    
    return {
      strategyType: 'Trend Following',
      entryPoints,
      exitPoints,
      stopLoss,
      takeProfit,
      timeframe: '1h-24h',
      riskLevel: 'medium',
      reasoning,
      confidence: prediction.confidence_1h,
    };
  }
  
  /**
   * Default strategy (fallback)
   */
  private defaultStrategy(
    prediction: NovaV2Prediction,
    currentPrice: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): StrategyRecommendation {
    const entryPoints = [currentPrice];
    const stopLoss = currentPrice * 0.95;
    const takeProfit = [currentPrice * 1.05, currentPrice * 1.10];
    const exitPoints = [currentPrice * 0.97];
    
    const reasoning = [
      'Conservative default strategy',
      'Market conditions unclear',
      'Reduced position sizing recommended',
      `Overall confidence: ${(prediction.overallConfidence * 100).toFixed(0)}%`,
    ];
    
    return {
      strategyType: prediction.strategyType,
      entryPoints,
      exitPoints,
      stopLoss,
      takeProfit,
      timeframe: '1h',
      riskLevel: 'low',
      reasoning,
      confidence: prediction.overallConfidence,
    };
  }
}
