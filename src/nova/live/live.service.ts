import { Logger } from '../../utils/logger';

const logger = new Logger('NovaLiveService');

export class NovaLiveService {
  getLivePrices() {
    const mockTokens = [
      { symbol: 'ETH', price: 2345.67, change1m: 0.12, change1h: 1.45, change24h: 3.21 },
      { symbol: 'BTC', price: 45678.90, change1m: -0.05, change1h: 0.89, change24h: 2.15 },
      { symbol: 'USDT', price: 1.00, change1m: 0.00, change1h: 0.01, change24h: 0.00 },
      { symbol: 'BNB', price: 312.45, change1m: 0.34, change1h: 2.11, change24h: 5.67 },
      { symbol: 'SOL', price: 98.76, change1m: -0.23, change1h: -1.12, change24h: 4.32 },
      { symbol: 'MATIC', price: 0.87, change1m: 0.56, change1h: 3.45, change24h: 8.91 },
      { symbol: 'AVAX', price: 34.21, change1m: 0.11, change1h: 1.23, change24h: 2.45 },
      { symbol: 'LINK', price: 14.56, change1m: -0.34, change1h: 0.67, change24h: 1.89 },
    ];

    logger.info('Returning mock live prices');
    return mockTokens;
  }

  getCandles(symbol: string) {
    const now = Date.now();
    const mockCandles = [];

    for (let i = 99; i >= 0; i--) {
      const timestamp = now - i * 5 * 60 * 1000;
      const basePrice = 100 + Math.random() * 50;
      const open = basePrice + (Math.random() - 0.5) * 5;
      const close = basePrice + (Math.random() - 0.5) * 5;
      const high = Math.max(open, close) + Math.random() * 3;
      const low = Math.min(open, close) - Math.random() * 3;
      const volume = Math.random() * 1000000;

      mockCandles.push({
        timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: parseFloat(volume.toFixed(2)),
      });
    }

    logger.info(`Returning mock candles for ${symbol}`);
    return mockCandles;
  }

  getPredictions(symbol: string) {
    const predictions = ['up', 'down', 'sideways'];
    const randomPrediction = () => predictions[Math.floor(Math.random() * predictions.length)];

    const mockPrediction = {
      symbol,
      next_1m: randomPrediction(),
      next_15m: randomPrediction(),
      next_1h: randomPrediction(),
      confidence: parseFloat((0.6 + Math.random() * 0.35).toFixed(2)),
      timestamp: Date.now(),
    };

    logger.info(`Returning mock prediction for ${symbol}`);
    return mockPrediction;
  }

  getReasoning(symbol: string) {
    const reasoningTemplates = [
      'Whale accumulation detected',
      'Volatility compression forming',
      'Possible breakout in 13–27 minutes',
      'Large buy wall at support level',
      'Unusual volume spike detected',
      'Smart money inflow increasing',
      'Liquidity pool depth improving',
      'Market maker activity intensifying',
      'Resistance level weakening',
      'Bullish divergence on RSI',
      'MACD crossover imminent',
      'Order book imbalance favoring buyers',
    ];

    const count = 3 + Math.floor(Math.random() * 3);
    const shuffled = [...reasoningTemplates].sort(() => Math.random() - 0.5);
    const reasoning = shuffled.slice(0, count);

    logger.info(`Returning mock reasoning for ${symbol}`);
    return reasoning;
  }
}
