import { RiskData, TokenData, LiquidityData, WhaleTransaction, VolatilityData } from '../types';
import { logger } from '../../utils/logger';

interface RiskFactors {
  volatility: number;
  liquidity: number;
  manipulation: number;
  sentiment: number;
}

class RiskScoreEngine {
  calculateRiskScore(
    symbol: string,
    chain: string,
    tokenData: TokenData | null,
    liquidityData: LiquidityData | null,
    volatilityData: VolatilityData | null,
    whaleActivity: WhaleTransaction[]
  ): RiskData {
    const factors: RiskFactors = {
      volatility: this.calculateVolatilityRisk(volatilityData),
      liquidity: this.calculateLiquidityRisk(liquidityData),
      manipulation: this.calculateManipulationRisk(whaleActivity, tokenData),
      sentiment: this.calculateSentimentRisk(tokenData, whaleActivity),
    };

    const riskScore = this.computeOverallRisk(factors);

    const riskData: RiskData = {
      symbol,
      chain,
      riskScore,
      factors,
      timestamp: new Date(),
    };

    logger.info(`Risk score calculated for ${symbol} on ${chain}: ${riskScore.toFixed(2)}`);

    return riskData;
  }

  private calculateVolatilityRisk(volatilityData: VolatilityData | null): number {
    if (!volatilityData) return 50;

    const { volatilityIndex, severity } = volatilityData;

    let baseRisk = Math.min(volatilityIndex * 10, 100);

    const severityMultiplier = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      extreme: 2.0,
    };

    baseRisk *= severityMultiplier[severity];

    return Math.min(Math.max(baseRisk, 0), 100);
  }

  private calculateLiquidityRisk(liquidityData: LiquidityData | null): number {
    if (!liquidityData) return 50;

    const { liquidity, liquidityChange, direction, severity } = liquidityData;

    let baseRisk = 0;

    if (liquidity < 100000) {
      baseRisk = 80;
    } else if (liquidity < 500000) {
      baseRisk = 60;
    } else if (liquidity < 1000000) {
      baseRisk = 40;
    } else if (liquidity < 5000000) {
      baseRisk = 20;
    } else {
      baseRisk = 10;
    }

    if (direction === 'decrease') {
      const severityMultiplier = {
        low: 1.1,
        medium: 1.3,
        high: 1.5,
      };
      baseRisk *= severityMultiplier[severity];
    }

    return Math.min(Math.max(baseRisk, 0), 100);
  }

  private calculateManipulationRisk(
    whaleActivity: WhaleTransaction[],
    tokenData: TokenData | null
  ): number {
    if (whaleActivity.length === 0) return 20;

    const recentWhales = whaleActivity.slice(-10);

    const highImpactWhales = recentWhales.filter((w) => w.impact === 'high').length;
    const mediumImpactWhales = recentWhales.filter((w) => w.impact === 'medium').length;

    let manipulationScore = 0;

    manipulationScore += highImpactWhales * 15;
    manipulationScore += mediumImpactWhales * 8;

    const sellPressure = recentWhales.filter((w) => w.direction === 'sell').length;
    const buyPressure = recentWhales.filter((w) => w.direction === 'buy').length;

    if (sellPressure > buyPressure * 2) {
      manipulationScore += 20;
    }

    if (tokenData && tokenData.volume24h < 100000) {
      manipulationScore += 15;
    }

    return Math.min(Math.max(manipulationScore, 0), 100);
  }

  private calculateSentimentRisk(
    tokenData: TokenData | null,
    whaleActivity: WhaleTransaction[]
  ): number {
    if (!tokenData) return 50;

    let sentimentRisk = 50;

    if (tokenData.change24h < -10) {
      sentimentRisk += 20;
    } else if (tokenData.change24h < -5) {
      sentimentRisk += 10;
    } else if (tokenData.change24h > 10) {
      sentimentRisk -= 10;
    } else if (tokenData.change24h > 5) {
      sentimentRisk -= 5;
    }

    const recentWhales = whaleActivity.slice(-5);
    const whaleBuys = recentWhales.filter((w) => w.direction === 'buy').length;
    const whaleSells = recentWhales.filter((w) => w.direction === 'sell').length;

    if (whaleBuys > whaleSells) {
      sentimentRisk -= 10;
    } else if (whaleSells > whaleBuys) {
      sentimentRisk += 10;
    }

    if (tokenData.volume24h < 50000) {
      sentimentRisk += 15;
    }

    return Math.min(Math.max(sentimentRisk, 0), 100);
  }

  private computeOverallRisk(factors: RiskFactors): number {
    const weights = {
      volatility: 0.3,
      liquidity: 0.3,
      manipulation: 0.25,
      sentiment: 0.15,
    };

    const overallRisk =
      factors.volatility * weights.volatility +
      factors.liquidity * weights.liquidity +
      factors.manipulation * weights.manipulation +
      factors.sentiment * weights.sentiment;

    return Math.min(Math.max(Math.round(overallRisk), 0), 100);
  }

  getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (riskScore < 25) return 'low';
    if (riskScore < 50) return 'medium';
    if (riskScore < 75) return 'high';
    return 'extreme';
  }
}

export const riskScoreEngine = new RiskScoreEngine();
