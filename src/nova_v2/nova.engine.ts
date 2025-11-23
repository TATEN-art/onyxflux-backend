import { Logger } from '../utils/logger';

const logger = new Logger('NovaEngineV2');

export interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface WhaleData {
  amount: number;
  amountUsd: number;
  type: 'buy' | 'sell';
  timestamp: number;
}

export interface LiquidityData {
  liquidityUsd: number;
  volume24h: number;
  timestamp: number;
}

export interface MarketStructure {
  support: number[];
  resistance: number[];
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number;
}

export interface NovaV2Prediction {
  predicted_1m: number;
  predicted_5m: number;
  predicted_15m: number;
  predicted_1h: number;
  predicted_4h: number;
  predicted_24h: number;
  
  direction_1m: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_5m: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_15m: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_1h: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_24h: 'UP' | 'DOWN' | 'SIDEWAYS';
  
  confidence_1m: number;
  confidence_5m: number;
  confidence_15m: number;
  confidence_1h: number;
  confidence_24h: number;
  
  volatilityScore: number;
  trendScore: number;
  whaleDeltaScore: number;
  liquidityShiftScore: number;
  marketStructureScore: number;
  aiEnhancedScore: number;
  
  strategyType: 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following';
  
  chainAdjustment: number;
  
  overallConfidence: number;
  
  reasoning: string[];
  
  timestamp: number;
}

export class NovaEngineV2 {
  private readonly NOISE_THRESHOLD = 0.02;
  private readonly WHALE_IMPACT_WEIGHT = 0.25;
  private readonly LIQUIDITY_IMPACT_WEIGHT = 0.20;
  
  /**
   * Main prediction engine - generates comprehensive multi-timeframe predictions
   */
  async generatePrediction(
    tokenAddress: string,
    chain: string,
    priceData: PriceData[],
    whaleData: WhaleData[],
    liquidityData: LiquidityData[]
  ): Promise<NovaV2Prediction> {
    try {
      logger.info(`Generating Nova V2 prediction for ${tokenAddress} on ${chain}`);
      
      if (priceData.length < 50) {
        throw new Error('Insufficient price data for Nova V2 prediction (minimum 50 data points)');
      }
      
      const currentPrice = priceData[priceData.length - 1].close;
      
      const volatilityScore = this.calculateVolatilityModel(priceData);
      const trendScore = this.calculateMultiTimeframeTrend(priceData);
      const whaleDeltaScore = this.calculateWhaleDeltaModel(whaleData, currentPrice);
      const liquidityShiftScore = this.calculateLiquidityShiftModel(liquidityData);
      const marketStructure = this.calculateMarketStructure(priceData);
      const marketStructureScore = marketStructure.strength;
      
      const cleanedPriceData = this.applyNoiseReduction(priceData);
      
      const pred1m = this.predictTimeframe(cleanedPriceData, whaleData, liquidityData, 1, chain);
      const pred5m = this.predictTimeframe(cleanedPriceData, whaleData, liquidityData, 5, chain);
      const pred15m = this.predictTimeframe(cleanedPriceData, whaleData, liquidityData, 15, chain);
      const pred1h = this.predictTimeframe(cleanedPriceData, whaleData, liquidityData, 60, chain);
      const pred4h = this.predictTimeframe(cleanedPriceData, whaleData, liquidityData, 240, chain);
      const pred24h = this.predictTimeframe(cleanedPriceData, whaleData, liquidityData, 1440, chain);
      
      const aiEnhancedScore = this.calculateAIEnhancedScore(
        volatilityScore,
        trendScore,
        whaleDeltaScore,
        liquidityShiftScore,
        marketStructureScore
      );
      
      const chainAdjustment = this.getChainAdjustment(chain);
      
      const strategyType = this.classifyStrategy(
        trendScore,
        volatilityScore,
        whaleDeltaScore,
        marketStructure
      );
      
      const overallConfidence = this.calculateOverallConfidence(
        pred1m.confidence,
        pred5m.confidence,
        pred15m.confidence,
        pred1h.confidence,
        aiEnhancedScore
      );
      
      const reasoning = this.generateReasoning(
        currentPrice,
        pred1m,
        pred1h,
        pred24h,
        trendScore,
        volatilityScore,
        whaleDeltaScore,
        liquidityShiftScore,
        marketStructure,
        strategyType,
        overallConfidence
      );
      
      return {
        predicted_1m: pred1m.price,
        predicted_5m: pred5m.price,
        predicted_15m: pred15m.price,
        predicted_1h: pred1h.price,
        predicted_4h: pred4h.price,
        predicted_24h: pred24h.price,
        
        direction_1m: pred1m.direction,
        direction_5m: pred5m.direction,
        direction_15m: pred15m.direction,
        direction_1h: pred1h.direction,
        direction_24h: pred24h.direction,
        
        confidence_1m: pred1m.confidence,
        confidence_5m: pred5m.confidence,
        confidence_15m: pred15m.confidence,
        confidence_1h: pred1h.confidence,
        confidence_24h: pred24h.confidence,
        
        volatilityScore,
        trendScore,
        whaleDeltaScore,
        liquidityShiftScore,
        marketStructureScore,
        aiEnhancedScore,
        
        strategyType,
        chainAdjustment,
        overallConfidence,
        reasoning,
        
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Nova V2 prediction error:', error);
      throw error;
    }
  }
  
  /**
   * Multi-timeframe trend model
   */
  private calculateMultiTimeframeTrend(data: PriceData[]): number {
    const shortTerm = this.calculateTrendForPeriod(data.slice(-10));
    const mediumTerm = this.calculateTrendForPeriod(data.slice(-30));
    const longTerm = this.calculateTrendForPeriod(data.slice(-100));
    
    return shortTerm * 0.5 + mediumTerm * 0.3 + longTerm * 0.2;
  }
  
  private calculateTrendForPeriod(data: PriceData[]): number {
    const n = data.length;
    if (n < 2) return 0;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i].close;
      sumXY += i * data[i].close;
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    
    return slope / avgPrice;
  }
  
  /**
   * Volatility model with clustering
   */
  private calculateVolatilityModel(data: PriceData[]): number {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].close - data[i - 1].close) / data[i - 1].close;
      returns.push(ret);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    const recentVolatility = this.calculateRecentVolatility(data.slice(-20));
    const clusteringFactor = recentVolatility / volatility;
    
    return volatility * clusteringFactor;
  }
  
  private calculateRecentVolatility(data: PriceData[]): number {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].close - data[i - 1].close) / data[i - 1].close;
      returns.push(ret);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Whale-delta model
   */
  private calculateWhaleDeltaModel(whaleData: WhaleData[], currentPrice: number): number {
    if (whaleData.length === 0) return 0;
    
    const recentWhales = whaleData.filter(w => Date.now() - w.timestamp < 3600000); // Last hour
    
    let buyVolume = 0;
    let sellVolume = 0;
    
    for (const whale of recentWhales) {
      if (whale.type === 'buy') {
        buyVolume += whale.amountUsd;
      } else {
        sellVolume += whale.amountUsd;
      }
    }
    
    const netDelta = buyVolume - sellVolume;
    const totalVolume = buyVolume + sellVolume;
    
    if (totalVolume === 0) return 0;
    
    return netDelta / totalVolume;
  }
  
  /**
   * Liquidity shift model
   */
  private calculateLiquidityShiftModel(liquidityData: LiquidityData[]): number {
    if (liquidityData.length < 2) return 0;
    
    const recent = liquidityData[liquidityData.length - 1];
    const previous = liquidityData[liquidityData.length - 2];
    
    const liquidityChange = (recent.liquidityUsd - previous.liquidityUsd) / previous.liquidityUsd;
    const volumeChange = (recent.volume24h - previous.volume24h) / previous.volume24h;
    
    return (liquidityChange * 0.6 + volumeChange * 0.4);
  }
  
  /**
   * Market structure model
   */
  private calculateMarketStructure(data: PriceData[]): MarketStructure {
    const support: number[] = [];
    const resistance: number[] = [];
    
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i].low;
      const prevLow1 = data[i - 1].low;
      const prevLow2 = data[i - 2].low;
      const nextLow1 = data[i + 1].low;
      const nextLow2 = data[i + 2].low;
      
      if (current < prevLow1 && current < prevLow2 && current < nextLow1 && current < nextLow2) {
        support.push(current);
      }
      
      const currentHigh = data[i].high;
      const prevHigh1 = data[i - 1].high;
      const prevHigh2 = data[i - 2].high;
      const nextHigh1 = data[i + 1].high;
      const nextHigh2 = data[i + 2].high;
      
      if (currentHigh > prevHigh1 && currentHigh > prevHigh2 && currentHigh > nextHigh1 && currentHigh > nextHigh2) {
        resistance.push(currentHigh);
      }
    }
    
    const trend = this.determineTrend(data);
    
    const strength = this.calculateTrendStrength(data);
    
    return {
      support: support.slice(-5),
      resistance: resistance.slice(-5),
      trend,
      strength,
    };
  }
  
  private determineTrend(data: PriceData[]): 'bullish' | 'bearish' | 'sideways' {
    const trendScore = this.calculateTrendForPeriod(data.slice(-30));
    
    if (trendScore > 0.01) return 'bullish';
    if (trendScore < -0.01) return 'bearish';
    return 'sideways';
  }
  
  private calculateTrendStrength(data: PriceData[]): number {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    const currentPrice = data[data.length - 1].close;
    
    return (currentPrice - lowestLow) / (highestHigh - lowestLow);
  }
  
  /**
   * AI-enhanced scoring
   */
  private calculateAIEnhancedScore(
    volatility: number,
    trend: number,
    whaleDelta: number,
    liquidityShift: number,
    marketStructure: number
  ): number {
    let score = 0.5;
    
    score += trend * 0.25;
    
    score += whaleDelta * this.WHALE_IMPACT_WEIGHT;
    
    score += liquidityShift * this.LIQUIDITY_IMPACT_WEIGHT;
    
    score += (marketStructure - 0.5) * 0.15;
    
    if (volatility > 0.1) {
      score *= 0.85;
    } else if (volatility < 0.03) {
      score *= 1.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Noise reduction model
   */
  private applyNoiseReduction(data: PriceData[]): PriceData[] {
    const cleaned: PriceData[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < 2 || i >= data.length - 2) {
        cleaned.push(data[i]);
        continue;
      }
      
      const avgClose = (data[i - 2].close + data[i - 1].close + data[i].close + data[i + 1].close + data[i + 2].close) / 5;
      const avgHigh = (data[i - 2].high + data[i - 1].high + data[i].high + data[i + 1].high + data[i + 2].high) / 5;
      const avgLow = (data[i - 2].low + data[i - 1].low + data[i].low + data[i + 1].low + data[i + 2].low) / 5;
      
      cleaned.push({
        ...data[i],
        close: avgClose,
        high: avgHigh,
        low: avgLow,
      });
    }
    
    return cleaned;
  }
  
  /**
   * Predict specific timeframe
   */
  private predictTimeframe(
    data: PriceData[],
    whaleData: WhaleData[],
    liquidityData: LiquidityData[],
    minutes: number,
    chain: string
  ): { price: number; direction: 'UP' | 'DOWN' | 'SIDEWAYS'; confidence: number } {
    const currentPrice = data[data.length - 1].close;
    
    const arimaPrice = this.arimaPredict(data, minutes);
    const holtWintersPrice = this.holtWintersPredict(data, minutes);
    const volatilityPrice = this.volatilityClusteringPredict(data, minutes);
    
    const whaleDelta = this.calculateWhaleDeltaModel(whaleData, currentPrice);
    const whaleImpact = currentPrice * whaleDelta * this.WHALE_IMPACT_WEIGHT * (minutes / 60);
    
    const liquidityShift = this.calculateLiquidityShiftModel(liquidityData);
    const liquidityImpact = currentPrice * liquidityShift * this.LIQUIDITY_IMPACT_WEIGHT * (minutes / 60);
    
    let predictedPrice = (arimaPrice * 0.35 + holtWintersPrice * 0.35 + volatilityPrice * 0.30);
    predictedPrice += whaleImpact + liquidityImpact;
    
    const chainAdj = this.getChainAdjustment(chain);
    predictedPrice *= (1 + chainAdj);
    
    const change = (predictedPrice - currentPrice) / currentPrice;
    let direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    
    if (change > 0.005) direction = 'UP';
    else if (change < -0.005) direction = 'DOWN';
    else direction = 'SIDEWAYS';
    
    const confidence = this.calculateTimeframeConfidence(data, minutes, whaleDelta, liquidityShift);
    
    return { price: predictedPrice, direction, confidence };
  }
  
  private arimaPredict(data: PriceData[], minutes: number): number {
    const prices = data.map(d => d.close);
    const n = prices.length;
    
    const diff1 = [];
    for (let i = 1; i < n; i++) {
      diff1.push(prices[i] - prices[i - 1]);
    }
    
    const avgDiff = diff1.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentPrice = prices[n - 1];
    
    return currentPrice + avgDiff * minutes;
  }
  
  private holtWintersPredict(data: PriceData[], minutes: number): number {
    const prices = data.map(d => d.close);
    const alpha = 0.3;
    const beta = 0.1;
    
    let level = prices[0];
    let trend = 0;
    
    for (let i = 1; i < prices.length; i++) {
      const prevLevel = level;
      level = alpha * prices[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    
    return level + trend * minutes;
  }
  
  private volatilityClusteringPredict(data: PriceData[], minutes: number): number {
    const prices = data.map(d => d.close);
    const volatility = this.calculateVolatilityModel(data);
    const currentPrice = prices[prices.length - 1];
    const trend = this.calculateTrendForPeriod(data.slice(-30));
    
    const drift = trend * currentPrice;
    const volatilityAdjustment = volatility * currentPrice;
    
    return currentPrice + drift * minutes + volatilityAdjustment * Math.sqrt(minutes) * 0.1;
  }
  
  private calculateTimeframeConfidence(
    data: PriceData[],
    minutes: number,
    whaleDelta: number,
    liquidityShift: number
  ): number {
    let confidence = 0.5;
    
    if (data.length > 100) confidence += 0.1;
    if (data.length > 200) confidence += 0.1;
    
    if (minutes <= 5) confidence += 0.15;
    else if (minutes <= 15) confidence += 0.10;
    else if (minutes <= 60) confidence += 0.05;
    else if (minutes >= 1440) confidence -= 0.10;
    
    if (Math.abs(whaleDelta) > 0.3) confidence += 0.10;
    
    if (Math.abs(liquidityShift) < 0.05) confidence += 0.05;
    else if (Math.abs(liquidityShift) > 0.20) confidence -= 0.10;
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }
  
  /**
   * Chain-specific adjustments
   */
  private getChainAdjustment(chain: string): number {
    const adjustments: Record<string, number> = {
      ethereum: 0,
      polygon: -0.002,
      arbitrum: -0.001,
      optimism: -0.001,
      base: -0.001,
      bsc: -0.003,
      avalanche: -0.002,
      fantom: -0.004,
      cronos: -0.003,
      linea: -0.002,
      scroll: -0.002,
      zksync: -0.001,
    };
    
    return adjustments[chain.toLowerCase()] || 0;
  }
  
  /**
   * Strategy classification
   */
  private classifyStrategy(
    trend: number,
    volatility: number,
    whaleDelta: number,
    marketStructure: MarketStructure
  ): 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following' {
    if (Math.abs(whaleDelta) > 0.4) {
      return 'Whale Momentum';
    }
    
    if (volatility > 0.08 && Math.abs(trend) > 0.02) {
      return 'Breakout';
    }
    
    if (volatility > 0.05 && volatility < 0.10 && Math.abs(trend) < 0.01) {
      return 'Scalper';
    }
    
    if (Math.abs(trend) > 0.03 && volatility < 0.06) {
      return 'Trend Following';
    }
    
    if (Math.abs(trend) > 0.01 && volatility < 0.08) {
      return 'Swing';
    }
    
    return 'Range Trading';
  }
  
  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    conf1m: number,
    conf5m: number,
    conf15m: number,
    conf1h: number,
    aiScore: number
  ): number {
    const timeframeConf = conf1m * 0.35 + conf5m * 0.25 + conf15m * 0.20 + conf1h * 0.20;
    
    return (timeframeConf * 0.7 + aiScore * 0.3);
  }
  
  /**
   * Generate reasoning
   */
  private generateReasoning(
    currentPrice: number,
    pred1m: { price: number; direction: string; confidence: number },
    pred1h: { price: number; direction: string; confidence: number },
    pred24h: { price: number; direction: string; confidence: number },
    trend: number,
    volatility: number,
    whaleDelta: number,
    liquidityShift: number,
    marketStructure: MarketStructure,
    strategyType: string,
    overallConfidence: number
  ): string[] {
    const reasoning: string[] = [];
    
    const change1m = ((pred1m.price - currentPrice) / currentPrice) * 100;
    const change1h = ((pred1h.price - currentPrice) / currentPrice) * 100;
    const change24h = ((pred24h.price - currentPrice) / currentPrice) * 100;
    
    reasoning.push(`Nova V2 predicts ${pred1m.direction} movement in next 1 minute (${change1m > 0 ? '+' : ''}${change1m.toFixed(2)}%)`);
    reasoning.push(`1-hour outlook: ${pred1h.direction} (${change1h > 0 ? '+' : ''}${change1h.toFixed(2)}%)`);
    reasoning.push(`24-hour forecast: ${pred24h.direction} (${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%)`);
    
    if (trend > 0.02) {
      reasoning.push('Strong bullish trend detected across multiple timeframes');
    } else if (trend < -0.02) {
      reasoning.push('Strong bearish trend detected across multiple timeframes');
    } else if (Math.abs(trend) < 0.005) {
      reasoning.push('Market is range-bound with no clear directional bias');
    }
    
    if (volatility > 0.10) {
      reasoning.push('High volatility detected - increased risk and opportunity');
    } else if (volatility < 0.03) {
      reasoning.push('Low volatility environment - stable price action expected');
    }
    
    if (whaleDelta > 0.3) {
      reasoning.push('Significant whale accumulation detected - bullish pressure');
    } else if (whaleDelta < -0.3) {
      reasoning.push('Heavy whale distribution detected - bearish pressure');
    } else if (Math.abs(whaleDelta) < 0.1) {
      reasoning.push('Minimal whale activity - retail-driven price action');
    }
    
    if (liquidityShift > 0.15) {
      reasoning.push('Liquidity influx detected - supports upward movement');
    } else if (liquidityShift < -0.15) {
      reasoning.push('Liquidity drain detected - risk of downward pressure');
    }
    
    reasoning.push(`Market structure: ${marketStructure.trend} (strength: ${(marketStructure.strength * 100).toFixed(0)}%)`);
    
    reasoning.push(`Recommended strategy: ${strategyType}`);
    
    reasoning.push(`Overall confidence: ${(overallConfidence * 100).toFixed(0)}%`);
    
    return reasoning;
  }
}
