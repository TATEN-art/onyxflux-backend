import { Logger } from '../utils/logger';
import { NovaV2Prediction, PriceData } from './nova.engine';
import { TradingSignal } from './nova.signals';
import { StrategyRecommendation } from './nova.strategy';

const logger = new Logger('NovaMarketDisplayV2');

export interface MarketDisplayData {
  symbol: string;
  chain: string;
  currentPrice: number;
  
  change1m: number;
  change5m: number;
  change15m: number;
  change1h: number;
  change4h: number;
  change24h: number;
  
  volume24h: number;
  volumeChange24h: number;
  
  prediction: NovaV2Prediction;
  
  signals: {
    '1m': TradingSignal;
    '5m': TradingSignal;
    '15m': TradingSignal;
    '1h': TradingSignal;
    '4h': TradingSignal;
    '24h': TradingSignal;
  };
  
  strategy: StrategyRecommendation;
  
  candles: CandleChartData[];
  
  indicators: MarketIndicators;
  
  liquidity: LiquidityData;
  
  whaleActivity: WhaleActivitySummary;
  
  timestamp: number;
}

export interface CandleChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
    ema200: number;
  };
  volumeProfile: {
    avgVolume: number;
    volumeRatio: number;
  };
}

export interface LiquidityData {
  liquidityUsd: number;
  liquidityChange24h: number;
  poolCount: number;
  topPools: Array<{
    address: string;
    liquidityUsd: number;
    volume24h: number;
  }>;
}

export interface WhaleActivitySummary {
  buyVolume24h: number;
  sellVolume24h: number;
  netDelta: number;
  whaleCount24h: number;
  largestTransaction: {
    amount: number;
    type: 'buy' | 'sell';
    timestamp: number;
  };
}

export class NovaMarketDisplayV2 {
  /**
   * Generate complete market display data for frontend
   */
  async generateMarketDisplay(
    symbol: string,
    chain: string,
    currentPrice: number,
    priceData: PriceData[],
    prediction: NovaV2Prediction,
    signals: Record<string, TradingSignal>,
    strategy: StrategyRecommendation
  ): Promise<MarketDisplayData> {
    logger.info(`Generating market display for ${symbol} on ${chain}`);
    
    const changes = this.calculatePriceChanges(priceData, currentPrice);
    
    const volumeData = this.calculateVolumeData(priceData);
    
    const candles = this.generateCandleData(priceData);
    
    const indicators = this.calculateMarketIndicators(priceData);
    
    const liquidity = this.generateLiquidityData();
    
    const whaleActivity = this.generateWhaleActivitySummary();
    
    return {
      symbol,
      chain,
      currentPrice,
      
      change1m: changes.change1m,
      change5m: changes.change5m,
      change15m: changes.change15m,
      change1h: changes.change1h,
      change4h: changes.change4h,
      change24h: changes.change24h,
      
      volume24h: volumeData.volume24h,
      volumeChange24h: volumeData.volumeChange24h,
      
      prediction,
      
      signals: {
        '1m': signals['1m'],
        '5m': signals['5m'],
        '15m': signals['15m'],
        '1h': signals['1h'],
        '4h': signals['4h'],
        '24h': signals['24h'],
      },
      
      strategy,
      
      candles,
      indicators,
      liquidity,
      whaleActivity,
      
      timestamp: Date.now(),
    };
  }
  
  /**
   * Calculate price changes for different timeframes
   */
  private calculatePriceChanges(
    priceData: PriceData[],
    currentPrice: number
  ): {
    change1m: number;
    change5m: number;
    change15m: number;
    change1h: number;
    change4h: number;
    change24h: number;
  } {
    const getPrice = (minutesAgo: number): number => {
      const index = priceData.length - minutesAgo - 1;
      return index >= 0 ? priceData[index].close : currentPrice;
    };
    
    const calculateChange = (oldPrice: number): number => {
      return ((currentPrice - oldPrice) / oldPrice) * 100;
    };
    
    return {
      change1m: calculateChange(getPrice(1)),
      change5m: calculateChange(getPrice(5)),
      change15m: calculateChange(getPrice(15)),
      change1h: calculateChange(getPrice(60)),
      change4h: calculateChange(getPrice(240)),
      change24h: calculateChange(getPrice(1440)),
    };
  }
  
  /**
   * Calculate volume data
   */
  private calculateVolumeData(priceData: PriceData[]): {
    volume24h: number;
    volumeChange24h: number;
  } {
    const last24h = priceData.slice(-1440);
    const previous24h = priceData.slice(-2880, -1440);
    
    const volume24h = last24h.reduce((sum, d) => sum + d.volume, 0);
    const volumePrevious24h = previous24h.reduce((sum, d) => sum + d.volume, 0);
    
    const volumeChange24h = volumePrevious24h > 0
      ? ((volume24h - volumePrevious24h) / volumePrevious24h) * 100
      : 0;
    
    return { volume24h, volumeChange24h };
  }
  
  /**
   * Generate candle chart data
   */
  private generateCandleData(priceData: PriceData[]): CandleChartData[] {
    return priceData.slice(-100).map(d => ({
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));
  }
  
  /**
   * Calculate market indicators
   */
  private calculateMarketIndicators(priceData: PriceData[]): MarketIndicators {
    const prices = priceData.map(d => d.close);
    
    return {
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
      bollingerBands: this.calculateBollingerBands(prices, 20, 2),
      ema: {
        ema9: this.calculateEMA(prices, 9),
        ema21: this.calculateEMA(prices, 21),
        ema50: this.calculateEMA(prices, 50),
        ema200: this.calculateEMA(prices, 200),
      },
      volumeProfile: this.calculateVolumeProfile(priceData),
    };
  }
  
  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    const recentChanges = changes.slice(-period);
    const gains = recentChanges.filter(c => c > 0);
    const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }
  
  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(prices: number[]): {
    macd: number;
    signal: number;
    histogram: number;
  } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    const signal = macd * 0.9;
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }
  
  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(
    prices: number[],
    period: number,
    stdDev: number
  ): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const recentPrices = prices.slice(-period);
    const middle = recentPrices.reduce((a, b) => a + b, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - middle, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: middle + (standardDeviation * stdDev),
      middle,
      lower: middle - (standardDeviation * stdDev),
    };
  }
  
  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
  
  /**
   * Calculate volume profile
   */
  private calculateVolumeProfile(priceData: PriceData[]): {
    avgVolume: number;
    volumeRatio: number;
  } {
    const volumes = priceData.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeRatio = recentVolume / avgVolume;
    
    return { avgVolume, volumeRatio };
  }
  
  /**
   * Generate liquidity data (mock for now)
   */
  private generateLiquidityData(): LiquidityData {
    return {
      liquidityUsd: 5000000 + Math.random() * 2000000,
      liquidityChange24h: (Math.random() - 0.5) * 20,
      poolCount: Math.floor(Math.random() * 10) + 3,
      topPools: [
        {
          address: '0x' + Math.random().toString(16).substr(2, 40),
          liquidityUsd: 2000000 + Math.random() * 1000000,
          volume24h: 500000 + Math.random() * 500000,
        },
        {
          address: '0x' + Math.random().toString(16).substr(2, 40),
          liquidityUsd: 1500000 + Math.random() * 500000,
          volume24h: 300000 + Math.random() * 300000,
        },
        {
          address: '0x' + Math.random().toString(16).substr(2, 40),
          liquidityUsd: 1000000 + Math.random() * 500000,
          volume24h: 200000 + Math.random() * 200000,
        },
      ],
    };
  }
  
  /**
   * Generate whale activity summary (mock for now)
   */
  private generateWhaleActivitySummary(): WhaleActivitySummary {
    const buyVolume = Math.random() * 5000000;
    const sellVolume = Math.random() * 5000000;
    
    return {
      buyVolume24h: buyVolume,
      sellVolume24h: sellVolume,
      netDelta: buyVolume - sellVolume,
      whaleCount24h: Math.floor(Math.random() * 50) + 10,
      largestTransaction: {
        amount: Math.random() * 2000000 + 500000,
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: Date.now() - Math.random() * 86400000,
      },
    };
  }
}
