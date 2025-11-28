import { ethers } from 'ethers';
import env from '../../config/env';
import { VolatilityData } from '../types';
import { logger } from '../../utils/logger';

interface PricePoint {
  price: number;
  timestamp: Date;
}

interface VolatilityFeedConfig {
  chain: 'ethereum' | 'base';
  rpcUrl: string;
  provider: ethers.JsonRpcProvider;
}

class VolatilityFeedService {
  private configs: Map<string, VolatilityFeedConfig> = new Map();
  private priceHistory: Map<string, PricePoint[]> = new Map();
  private readonly maxHistoryLength = 100;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const chains: Array<{ name: 'ethereum' | 'base'; rpcUrl: string }> = [
      { name: 'ethereum', rpcUrl: env.ETH_RPC_URL },
      { name: 'base', rpcUrl: env.BASE_RPC_URL },
    ];

    for (const { name, rpcUrl } of chains) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        this.configs.set(name, { chain: name, rpcUrl, provider });
        this.reconnectAttempts.set(name, 0);
        logger.info(`Volatility feed initialized for ${name}`);
      } catch (error) {
        logger.error(`Failed to initialize volatility feed for ${name}:`, error);
      }
    }
  }

  async reconnect(chain: string): Promise<boolean> {
    const attempts = this.reconnectAttempts.get(chain) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts reached for ${chain}`);
      return false;
    }

    try {
      const config = this.configs.get(chain);
      if (!config) return false;

      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.configs.set(chain, { ...config, provider });
      this.reconnectAttempts.set(chain, 0);
      logger.info(`Reconnected volatility feed for ${chain}`);
      return true;
    } catch (error) {
      this.reconnectAttempts.set(chain, attempts + 1);
      logger.error(`Reconnect failed for ${chain}:`, error);
      return false;
    }
  }

  addPricePoint(symbol: string, chain: string, price: number) {
    const key = `${chain}:${symbol}`;
    let history = this.priceHistory.get(key);

    if (!history) {
      history = [];
      this.priceHistory.set(key, history);
    }

    history.push({ price, timestamp: new Date() });

    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  calculateVolatility(symbol: string, chain: string): VolatilityData | null {
    const key = `${chain}:${symbol}`;
    const history = this.priceHistory.get(key);

    if (!history || history.length < 10) {
      return null;
    }

    const prices = history.map((p) => p.price);
    const returns = [];

    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(returnValue);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const volatilityIndex = stdDev * 100;

    const priceSwing = this.calculatePriceSwing(prices);

    const severity = this.calculateSeverity(volatilityIndex);

    const volatilityData: VolatilityData = {
      symbol,
      chain,
      volatilityIndex,
      priceSwing,
      severity,
      timestamp: new Date(),
    };

    return volatilityData;
  }

  private calculatePriceSwing(prices: number[]): number {
    if (prices.length === 0) return 0;

    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;

    return ((max - min) / avg) * 100;
  }

  private calculateSeverity(volatilityIndex: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (volatilityIndex < 2) return 'low';
    if (volatilityIndex < 5) return 'medium';
    if (volatilityIndex < 10) return 'high';
    return 'extreme';
  }

  detectVolatilitySpike(
    symbol: string,
    chain: string,
    threshold: number = 5
  ): VolatilityData | null {
    const volatilityData = this.calculateVolatility(symbol, chain);

    if (!volatilityData) return null;

    if (volatilityData.volatilityIndex >= threshold) {
      logger.info(
        `Volatility spike detected for ${symbol} on ${chain}: ${volatilityData.volatilityIndex.toFixed(2)}%`
      );
      return volatilityData;
    }

    return null;
  }

  startVolatilityMonitoring(
    symbol: string,
    chain: 'ethereum' | 'base',
    priceCallback: (price: number) => void,
    spikeCallback: (data: VolatilityData) => void,
    spikeThreshold: number = 5
  ): NodeJS.Timeout {
    const interval = setInterval(() => {
      const spike = this.detectVolatilitySpike(symbol, chain, spikeThreshold);
      if (spike) {
        spikeCallback(spike);
      }
    }, 5000);

    return interval;
  }

  stopVolatilityMonitoring(interval: NodeJS.Timeout) {
    clearInterval(interval);
  }

  getVolatilityHistory(symbol: string, chain: string): PricePoint[] {
    const key = `${chain}:${symbol}`;
    return this.priceHistory.get(key) || [];
  }

  clearHistory(symbol: string, chain: string) {
    const key = `${chain}:${symbol}`;
    this.priceHistory.delete(key);
  }
}

export const volatilityFeedService = new VolatilityFeedService();
