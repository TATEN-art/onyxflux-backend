import { Logger } from '../utils/logger';
import { NovaV2Prediction } from './nova.engine';
import { AlertMessage } from './nova.websocket';
import prisma from '../config/database';

const logger = new Logger('NovaAlertsV2');

export interface WhaleActivityAlert {
  type: 'whale';
  walletAddress: string;
  amount: number;
  amountUsd: number;
  action: 'buy' | 'sell';
  classification: 'small' | 'medium' | 'mega' | 'institutional';
  symbol: string;
  chain: string;
}

export interface LiquidityAlert {
  type: 'liquidity';
  liquidityUsd: number;
  change: number;
  changePercent: number;
  symbol: string;
  chain: string;
}

export interface VolatilityAlert {
  type: 'volatility';
  volatilityScore: number;
  priceChange: number;
  timeframe: string;
  symbol: string;
  chain: string;
}

export interface RugpullAlert {
  type: 'rugpull';
  confidence: number;
  indicators: string[];
  symbol: string;
  chain: string;
}

export interface MEVAlert {
  type: 'mev';
  pattern: string;
  txHashes: string[];
  estimatedImpact: number;
  symbol: string;
  chain: string;
}

export interface GasAlert {
  type: 'gas';
  gasPrice: number;
  change: number;
  threshold: number;
  chain: string;
}

export interface AdminWalletAlert {
  type: 'admin_wallet';
  walletAddress: string;
  action: string;
  amount: number;
  symbol: string;
  chain: string;
}

export class NovaAlertsV2 {
  private readonly WHALE_THRESHOLDS = {
    small: 250000,
    medium: 500000,
    mega: 1000000,
    institutional: 5000000,
  };
  
  private readonly VOLATILITY_THRESHOLD = 0.08;
  private readonly LIQUIDITY_DROP_THRESHOLD = -0.15;
  private readonly GAS_SPIKE_THRESHOLD = 1.5; // 50% increase
  
  /**
   * Analyze prediction and generate alerts
   */
  async analyzeAndGenerateAlerts(
    symbol: string,
    chain: string,
    prediction: NovaV2Prediction,
    currentPrice: number,
    userId?: string
  ): Promise<AlertMessage[]> {
    const alerts: AlertMessage[] = [];
    
    if (prediction.volatilityScore > this.VOLATILITY_THRESHOLD) {
      alerts.push(await this.generateVolatilityAlert({
        type: 'volatility',
        volatilityScore: prediction.volatilityScore,
        priceChange: ((prediction.predicted_1h - currentPrice) / currentPrice) * 100,
        timeframe: '1h',
        symbol,
        chain,
      }));
    }
    
    if (Math.abs(prediction.whaleDeltaScore) > 0.3) {
      alerts.push(await this.generateWhaleActivityAlert({
        type: 'whale',
        walletAddress: 'multiple', // Aggregated
        amount: 0,
        amountUsd: 0,
        action: prediction.whaleDeltaScore > 0 ? 'buy' : 'sell',
        classification: Math.abs(prediction.whaleDeltaScore) > 0.5 ? 'mega' : 'medium',
        symbol,
        chain,
      }));
    }
    
    if (prediction.liquidityShiftScore < this.LIQUIDITY_DROP_THRESHOLD) {
      alerts.push(await this.generateLiquidityAlert({
        type: 'liquidity',
        liquidityUsd: 0, // Would be populated from actual data
        change: 0,
        changePercent: prediction.liquidityShiftScore * 100,
        symbol,
        chain,
      }));
    }
    
    if (userId && alerts.length > 0) {
      await this.saveAlertsToDatabase(userId, alerts);
    }
    
    return alerts;
  }
  
  /**
   * Generate whale activity alert
   */
  async generateWhaleActivityAlert(data: WhaleActivityAlert): Promise<AlertMessage> {
    const severity = this.determineWhaleSeverity(data.classification, data.action);
    
    const title = `${data.classification.toUpperCase()} Whale ${data.action.toUpperCase()} Detected`;
    const message = `${data.classification} whale ${data.action} activity detected for ${data.symbol} on ${data.chain}. Significant market impact expected.`;
    
    logger.info(`Whale alert generated: ${title}`);
    
    return {
      type: 'whale',
      severity,
      title,
      message,
      symbol: data.symbol,
      chain: data.chain,
      metadata: {
        walletAddress: data.walletAddress,
        amount: data.amount,
        amountUsd: data.amountUsd,
        action: data.action,
        classification: data.classification,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate liquidity alert
   */
  async generateLiquidityAlert(data: LiquidityAlert): Promise<AlertMessage> {
    const severity = Math.abs(data.changePercent) > 25 ? 'critical' : Math.abs(data.changePercent) > 15 ? 'high' : 'medium';
    
    const title = data.changePercent < 0 ? 'Liquidity Drop Detected' : 'Liquidity Surge Detected';
    const message = `Liquidity ${data.changePercent < 0 ? 'decreased' : 'increased'} by ${Math.abs(data.changePercent).toFixed(1)}% for ${data.symbol} on ${data.chain}. ${data.changePercent < 0 ? 'Increased slippage risk.' : 'Improved trading conditions.'}`;
    
    logger.info(`Liquidity alert generated: ${title}`);
    
    return {
      type: 'liquidity',
      severity,
      title,
      message,
      symbol: data.symbol,
      chain: data.chain,
      metadata: {
        liquidityUsd: data.liquidityUsd,
        change: data.change,
        changePercent: data.changePercent,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate volatility alert
   */
  async generateVolatilityAlert(data: VolatilityAlert): Promise<AlertMessage> {
    const severity = data.volatilityScore > 0.15 ? 'high' : data.volatilityScore > 0.10 ? 'medium' : 'low';
    
    const title = 'High Volatility Detected';
    const message = `Volatility spike detected for ${data.symbol} on ${data.chain}. Volatility score: ${(data.volatilityScore * 100).toFixed(1)}%. Expected price movement: ${data.priceChange > 0 ? '+' : ''}${data.priceChange.toFixed(2)}% in ${data.timeframe}.`;
    
    logger.info(`Volatility alert generated: ${title}`);
    
    return {
      type: 'volatility',
      severity,
      title,
      message,
      symbol: data.symbol,
      chain: data.chain,
      metadata: {
        volatilityScore: data.volatilityScore,
        priceChange: data.priceChange,
        timeframe: data.timeframe,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate rugpull danger alert
   */
  async generateRugpullAlert(data: RugpullAlert): Promise<AlertMessage> {
    const severity = data.confidence > 0.8 ? 'critical' : data.confidence > 0.6 ? 'high' : 'medium';
    
    const title = '⚠️ RUGPULL DANGER DETECTED';
    const message = `Potential rugpull detected for ${data.symbol} on ${data.chain}. Confidence: ${(data.confidence * 100).toFixed(0)}%. Indicators: ${data.indicators.join(', ')}. EXTREME CAUTION ADVISED.`;
    
    logger.warn(`Rugpull alert generated: ${title}`);
    
    return {
      type: 'rugpull',
      severity,
      title,
      message,
      symbol: data.symbol,
      chain: data.chain,
      metadata: {
        confidence: data.confidence,
        indicators: data.indicators,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate MEV attack pattern alert
   */
  async generateMEVAlert(data: MEVAlert): Promise<AlertMessage> {
    const severity = data.estimatedImpact > 10000 ? 'high' : data.estimatedImpact > 5000 ? 'medium' : 'low';
    
    const title = 'MEV Attack Pattern Detected';
    const message = `MEV attack pattern "${data.pattern}" detected for ${data.symbol} on ${data.chain}. Estimated impact: $${data.estimatedImpact.toFixed(2)}. Transactions: ${data.txHashes.length}.`;
    
    logger.info(`MEV alert generated: ${title}`);
    
    return {
      type: 'mev',
      severity,
      title,
      message,
      symbol: data.symbol,
      chain: data.chain,
      metadata: {
        pattern: data.pattern,
        txHashes: data.txHashes,
        estimatedImpact: data.estimatedImpact,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate gas spike alert
   */
  async generateGasAlert(data: GasAlert): Promise<AlertMessage> {
    const severity = data.change > 2.0 ? 'high' : data.change > 1.5 ? 'medium' : 'low';
    
    const title = 'Gas Price Spike Detected';
    const message = `Gas prices on ${data.chain} have increased by ${((data.change - 1) * 100).toFixed(0)}%. Current: ${data.gasPrice} gwei. Consider delaying transactions.`;
    
    logger.info(`Gas alert generated: ${title}`);
    
    return {
      type: 'gas',
      severity,
      title,
      message,
      chain: data.chain,
      metadata: {
        gasPrice: data.gasPrice,
        change: data.change,
        threshold: data.threshold,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate admin wallet movement alert
   */
  async generateAdminWalletAlert(data: AdminWalletAlert): Promise<AlertMessage> {
    const severity = data.amount > 1000000 ? 'critical' : data.amount > 500000 ? 'high' : 'medium';
    
    const title = 'Admin Wallet Activity Detected';
    const message = `Admin wallet ${data.walletAddress.substring(0, 10)}... performed ${data.action} for ${data.symbol} on ${data.chain}. Amount: $${data.amount.toFixed(2)}. Monitor for potential impact.`;
    
    logger.warn(`Admin wallet alert generated: ${title}`);
    
    return {
      type: 'admin_wallet',
      severity,
      title,
      message,
      symbol: data.symbol,
      chain: data.chain,
      metadata: {
        walletAddress: data.walletAddress,
        action: data.action,
        amount: data.amount,
      },
      timestamp: Date.now(),
    };
  }
  
  /**
   * Determine whale alert severity
   */
  private determineWhaleSeverity(
    classification: string,
    action: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (classification === 'institutional') return 'critical';
    if (classification === 'mega') return 'high';
    if (classification === 'medium') return 'medium';
    return 'low';
  }
  
  /**
   * Save alerts to database
   */
  private async saveAlertsToDatabase(userId: string, alerts: AlertMessage[]): Promise<void> {
    try {
      for (const alert of alerts) {
        await prisma.alert.create({
          data: {
            userId,
            type: this.mapAlertTypeToEnum(alert.type),
            title: alert.title,
            message: alert.message,
            severity: alert.severity,
            metadata: alert.metadata as any,
            read: false,
          },
        });
      }
      
      logger.info(`Saved ${alerts.length} alerts to database for user ${userId}`);
    } catch (error) {
      logger.error('Error saving alerts to database:', error);
    }
  }
  
  /**
   * Map alert type to Prisma enum
   */
  private mapAlertTypeToEnum(type: string): any {
    const mapping: Record<string, string> = {
      whale: 'WHALE_BUY', // Default, would need more context
      liquidity: 'LIQUIDITY_WARNING',
      volatility: 'BREAKOUT_SIGNAL',
      rugpull: 'MANIPULATION_RUG',
      mev: 'MANIPULATION_WASH',
      gas: 'BREAKOUT_SIGNAL',
      admin_wallet: 'WHALE_INSTITUTIONAL',
    };
    
    return mapping[type] || 'BREAKOUT_SIGNAL';
  }
  
  /**
   * Get user alert preferences
   */
  async getUserAlertPreferences(userId: string): Promise<{
    whaleAlerts: boolean;
    liquidityAlerts: boolean;
    volatilityAlerts: boolean;
    rugpullAlerts: boolean;
    mevAlerts: boolean;
    gasAlerts: boolean;
  }> {
    try {
      return {
        whaleAlerts: true,
        liquidityAlerts: true,
        volatilityAlerts: true,
        rugpullAlerts: true,
        mevAlerts: true,
        gasAlerts: true,
      };
    } catch (error) {
      logger.error('Error fetching user alert preferences:', error);
      return {
        whaleAlerts: true,
        liquidityAlerts: true,
        volatilityAlerts: true,
        rugpullAlerts: true,
        mevAlerts: true,
        gasAlerts: true,
      };
    }
  }
}
