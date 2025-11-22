import { Logger } from '../../utils/logger';

const logger = new Logger('PredictionService');

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
}

interface PredictionResult {
  predicted_price: number;
  prediction_1h: number;
  prediction_4h: number;
  prediction_24h: number;
  confidence: number;
  reasoning: string;
}

export class PredictionService {
  async predictPrice(
    tokenAddress: string,
    chain: string,
    historicalData: PriceData[]
  ): Promise<PredictionResult> {
    try {
      if (historicalData.length < 10) {
        throw new Error('Insufficient historical data for prediction');
      }

      const volatilityScore = this.calculateVolatility(historicalData);
      const trendScore = this.calculateTrend(historicalData);
      const volumeScore = this.calculateVolumeScore(historicalData);

      const arimaForecast = this.arimaPredict(historicalData);
      const holtWintersForecast = this.holtWintersPredict(historicalData);
      const volatilityForecast = this.volatilityClusteringPredict(historicalData);

      const currentPrice = historicalData[historicalData.length - 1].price;
      
      const prediction1h = this.weightedAverage([
        { value: arimaForecast.hour1, weight: 0.4 },
        { value: holtWintersForecast.hour1, weight: 0.3 },
        { value: volatilityForecast.hour1, weight: 0.3 },
      ]);

      const prediction4h = this.weightedAverage([
        { value: arimaForecast.hour4, weight: 0.4 },
        { value: holtWintersForecast.hour4, weight: 0.3 },
        { value: volatilityForecast.hour4, weight: 0.3 },
      ]);

      const prediction24h = this.weightedAverage([
        { value: arimaForecast.hour24, weight: 0.35 },
        { value: holtWintersForecast.hour24, weight: 0.35 },
        { value: volatilityForecast.hour24, weight: 0.3 },
      ]);

      const confidence = this.calculateConfidence(
        historicalData,
        volatilityScore,
        volumeScore
      );

      const reasoning = this.generateReasoning(
        currentPrice,
        prediction1h,
        prediction24h,
        trendScore,
        volatilityScore,
        volumeScore,
        confidence
      );

      logger.info(`Prediction generated for ${tokenAddress} on ${chain}`);

      return {
        predicted_price: prediction1h,
        prediction_1h: prediction1h,
        prediction_4h: prediction4h,
        prediction_24h: prediction24h,
        confidence,
        reasoning,
      };
    } catch (error) {
      logger.error('Prediction error:', error);
      throw error;
    }
  }

  private calculateVolatility(data: PriceData[]): number {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].price - data[i - 1].price) / data[i - 1].price;
      returns.push(ret);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateTrend(data: PriceData[]): number {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i].price;
      sumXY += i * data[i].price;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    
    return slope / avgPrice;
  }

  private calculateVolumeScore(data: PriceData[]): number {
    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    
    return recentVolume / avgVolume;
  }

  private arimaPredict(data: PriceData[]): { hour1: number; hour4: number; hour24: number } {
    const prices = data.map(d => d.price);
    const n = prices.length;
    
    const diff1 = [];
    for (let i = 1; i < n; i++) {
      diff1.push(prices[i] - prices[i - 1]);
    }

    const avgDiff = diff1.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const currentPrice = prices[n - 1];

    return {
      hour1: currentPrice + avgDiff * 1,
      hour4: currentPrice + avgDiff * 4,
      hour24: currentPrice + avgDiff * 24,
    };
  }

  private holtWintersPredict(data: PriceData[]): { hour1: number; hour4: number; hour24: number } {
    const prices = data.map(d => d.price);
    const alpha = 0.3;
    const beta = 0.1;

    let level = prices[0];
    let trend = 0;

    for (let i = 1; i < prices.length; i++) {
      const prevLevel = level;
      level = alpha * prices[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    return {
      hour1: level + trend * 1,
      hour4: level + trend * 4,
      hour24: level + trend * 24,
    };
  }

  private volatilityClusteringPredict(data: PriceData[]): { hour1: number; hour4: number; hour24: number } {
    const prices = data.map(d => d.price);
    const volatility = this.calculateVolatility(data);
    const currentPrice = prices[prices.length - 1];
    const trend = this.calculateTrend(data);

    const drift = trend * currentPrice;
    const volatilityAdjustment = volatility * currentPrice;

    return {
      hour1: currentPrice + drift * 1 + volatilityAdjustment * 0.1,
      hour4: currentPrice + drift * 4 + volatilityAdjustment * 0.2,
      hour24: currentPrice + drift * 24 + volatilityAdjustment * 0.5,
    };
  }

  private weightedAverage(values: Array<{ value: number; weight: number }>): number {
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    const weightedSum = values.reduce((sum, v) => sum + v.value * v.weight, 0);
    return weightedSum / totalWeight;
  }

  private calculateConfidence(
    data: PriceData[],
    volatility: number,
    volumeScore: number
  ): number {
    let confidence = 0.5;

    if (data.length > 50) confidence += 0.1;
    if (data.length > 100) confidence += 0.1;

    if (volatility < 0.02) confidence += 0.15;
    else if (volatility < 0.05) confidence += 0.1;
    else if (volatility > 0.15) confidence -= 0.2;

    if (volumeScore > 1.5) confidence += 0.1;
    else if (volumeScore < 0.5) confidence -= 0.1;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private generateReasoning(
    currentPrice: number,
    prediction1h: number,
    prediction24h: number,
    trend: number,
    volatility: number,
    volumeScore: number,
    confidence: number
  ): string {
    const change1h = ((prediction1h - currentPrice) / currentPrice) * 100;
    const change24h = ((prediction24h - currentPrice) / currentPrice) * 100;

    let reasoning = `Based on multi-model analysis (ARIMA, Holt-Winters, Volatility Clustering), `;

    if (Math.abs(change1h) < 1) {
      reasoning += `the price is expected to remain relatively stable in the short term. `;
    } else if (change1h > 0) {
      reasoning += `the price is predicted to increase by ${change1h.toFixed(2)}% in the next hour. `;
    } else {
      reasoning += `the price is predicted to decrease by ${Math.abs(change1h).toFixed(2)}% in the next hour. `;
    }

    if (trend > 0.01) {
      reasoning += `Strong upward trend detected. `;
    } else if (trend < -0.01) {
      reasoning += `Strong downward trend detected. `;
    } else {
      reasoning += `Price movement is range-bound. `;
    }

    if (volatility > 0.1) {
      reasoning += `High volatility suggests increased risk. `;
    } else if (volatility < 0.03) {
      reasoning += `Low volatility indicates stable price action. `;
    }

    if (volumeScore > 1.5) {
      reasoning += `Elevated trading volume supports the prediction. `;
    } else if (volumeScore < 0.7) {
      reasoning += `Lower volume suggests weaker conviction. `;
    }

    reasoning += `Confidence: ${(confidence * 100).toFixed(0)}%.`;

    return reasoning;
  }
}
