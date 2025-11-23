import { Logger } from '../utils/logger';
import { NovaEngineV2, PriceData, WhaleData, LiquidityData } from '../nova_v2/nova.engine';
import { NovaStrategyV2, StrategyRecommendation } from '../nova_v2/nova.strategy';
import { NovaSignalsV2, TradingSignal } from '../nova_v2/nova.signals';

const logger = new Logger('BacktestEngine');

export interface BacktestConfig {
  token: string;
  chain: string;
  strategy: 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following' | 'Auto';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '24h';
  startDate: number;
  endDate: number;
  initialCapital: number;
  riskLevel: 'low' | 'medium' | 'high';
  stopLossPercent?: number;
  takeProfitPercent?: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  
  sharpeRatio: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  
  trades: BacktestTrade[];
  
  equityCurve: EquityPoint[];
  
  bestStrategy: string;
  strategyBreakdown: Record<string, StrategyPerformance>;
  
  recommendations: string[];
  
  completedAt: number;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  type: 'BUY' | 'SELL';
  strategy: string;
  signal: TradingSignal;
  pnl: number;
  pnlPercent: number;
  reason: string;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
}

export interface StrategyPerformance {
  strategy: string;
  trades: number;
  winRate: number;
  totalReturn: number;
  averageReturn: number;
  maxDrawdown: number;
}

export class BacktestEngine {
  private novaEngine: NovaEngineV2;
  private novaStrategy: NovaStrategyV2;
  private novaSignals: NovaSignalsV2;
  
  constructor() {
    this.novaEngine = new NovaEngineV2();
    this.novaStrategy = new NovaStrategyV2();
    this.novaSignals = new NovaSignalsV2();
  }
  
  /**
   * Run backtest simulation
   */
  async runBacktest(
    config: BacktestConfig,
    priceData: PriceData[],
    whaleData: WhaleData[],
    liquidityData: LiquidityData[]
  ): Promise<BacktestResult> {
    logger.info(`Running backtest for ${config.token} on ${config.chain}`);
    logger.info(`Strategy: ${config.strategy}, Timeframe: ${config.timeframe}, Period: ${new Date(config.startDate).toISOString()} to ${new Date(config.endDate).toISOString()}`);
    
    try {
      const filteredPriceData = priceData.filter(
        d => d.timestamp >= config.startDate && d.timestamp <= config.endDate
      );
      
      if (filteredPriceData.length < 50) {
        throw new Error('Insufficient data for backtesting (minimum 50 data points required)');
      }
      
      let capital = config.initialCapital;
      let position: BacktestTrade | null = null;
      const trades: BacktestTrade[] = [];
      const equityCurve: EquityPoint[] = [];
      const strategyPerformance: Map<string, StrategyPerformance> = new Map();
      
      let maxEquity = capital;
      let maxDrawdown = 0;
      
      for (let i = 50; i < filteredPriceData.length; i++) {
        const currentData = filteredPriceData.slice(Math.max(0, i - 200), i + 1);
        const currentPrice = currentData[currentData.length - 1].close;
        const currentTime = currentData[currentData.length - 1].timestamp;
        
        const relevantWhaleData = whaleData.filter(
          w => w.timestamp <= currentTime && w.timestamp >= currentTime - 3600000
        );
        const relevantLiquidityData = liquidityData.filter(
          l => l.timestamp <= currentTime
        ).slice(-2);
        
        const prediction = await this.novaEngine.generatePrediction(
          config.token,
          config.chain,
          currentData,
          relevantWhaleData,
          relevantLiquidityData
        );
        
        const riskTolerance = config.riskLevel === 'low' ? 'conservative' : config.riskLevel === 'high' ? 'aggressive' : 'moderate';
        const strategyRec = this.novaStrategy.selectStrategy(prediction, currentPrice, riskTolerance);
        
        const activeStrategy = config.strategy === 'Auto' ? strategyRec.strategyType : config.strategy;
        
        const signal = this.novaSignals.generateSignal(
          prediction,
          strategyRec,
          currentPrice,
          config.timeframe
        );
        
        if (position) {
          const shouldExit = this.shouldExitPosition(position, currentPrice, signal, config);
          
          if (shouldExit.exit) {
            const exitTrade = this.closePosition(position, currentPrice, currentTime, shouldExit.reason);
            trades.push(exitTrade);
            capital += exitTrade.pnl;
            position = null;
            
            this.updateStrategyPerformance(strategyPerformance, exitTrade);
          }
        }
        
        if (!position && signal.signal !== 'HOLD' && signal.confidence > 0.60) {
          position = this.openPosition(
            signal,
            currentPrice,
            currentTime,
            capital,
            activeStrategy,
            config
          );
        }
        
        const currentEquity = position 
          ? capital + (position.quantity * currentPrice - position.quantity * position.entryPrice)
          : capital;
        
        maxEquity = Math.max(maxEquity, currentEquity);
        const drawdown = maxEquity - currentEquity;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
        
        equityCurve.push({
          timestamp: currentTime,
          equity: currentEquity,
          drawdown: drawdown / maxEquity,
        });
      }
      
      if (position) {
        const finalPrice = filteredPriceData[filteredPriceData.length - 1].close;
        const finalTime = filteredPriceData[filteredPriceData.length - 1].timestamp;
        const exitTrade = this.closePosition(position, finalPrice, finalTime, 'Backtest ended');
        trades.push(exitTrade);
        capital += exitTrade.pnl;
        this.updateStrategyPerformance(strategyPerformance, exitTrade);
      }
      
      const metrics = this.calculateMetrics(trades, config.initialCapital, capital, maxDrawdown);
      
      const bestStrategy = this.findBestStrategy(strategyPerformance);
      
      const recommendations = this.generateRecommendations(metrics, strategyPerformance, config);
      
      const result: BacktestResult = {
        config,
        ...metrics,
        trades,
        equityCurve,
        bestStrategy,
        strategyBreakdown: Object.fromEntries(strategyPerformance),
        recommendations,
        completedAt: Date.now(),
      };
      
      logger.info(`Backtest completed: ${trades.length} trades, ${metrics.winRate.toFixed(1)}% win rate, ${metrics.totalReturnPercent.toFixed(2)}% return`);
      
      return result;
    } catch (error) {
      logger.error('Error running backtest:', error);
      throw error;
    }
  }
  
  /**
   * Open a new position
   */
  private openPosition(
    signal: TradingSignal,
    price: number,
    time: number,
    capital: number,
    strategy: string,
    config: BacktestConfig
  ): BacktestTrade {
    const positionSize = capital * 0.1; // 10% of capital per trade
    const quantity = positionSize / price;
    
    return {
      entryTime: time,
      exitTime: 0,
      entryPrice: price,
      exitPrice: 0,
      quantity,
      type: signal.signal as 'BUY' | 'SELL',
      strategy,
      signal,
      pnl: 0,
      pnlPercent: 0,
      reason: '',
    };
  }
  
  /**
   * Close a position
   */
  private closePosition(
    position: BacktestTrade,
    price: number,
    time: number,
    reason: string
  ): BacktestTrade {
    const pnl = position.type === 'BUY'
      ? (price - position.entryPrice) * position.quantity
      : (position.entryPrice - price) * position.quantity;
    
    const pnlPercent = position.type === 'BUY'
      ? ((price - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - price) / position.entryPrice) * 100;
    
    return {
      ...position,
      exitTime: time,
      exitPrice: price,
      pnl,
      pnlPercent,
      reason,
    };
  }
  
  /**
   * Check if position should be exited
   */
  private shouldExitPosition(
    position: BacktestTrade,
    currentPrice: number,
    signal: TradingSignal,
    config: BacktestConfig
  ): { exit: boolean; reason: string } {
    if (config.stopLossPercent) {
      const loss = position.type === 'BUY'
        ? (position.entryPrice - currentPrice) / position.entryPrice
        : (currentPrice - position.entryPrice) / position.entryPrice;
      
      if (loss > config.stopLossPercent / 100) {
        return { exit: true, reason: 'Stop loss triggered' };
      }
    }
    
    if (config.takeProfitPercent) {
      const profit = position.type === 'BUY'
        ? (currentPrice - position.entryPrice) / position.entryPrice
        : (position.entryPrice - currentPrice) / position.entryPrice;
      
      if (profit > config.takeProfitPercent / 100) {
        return { exit: true, reason: 'Take profit triggered' };
      }
    }
    
    if (position.type === 'BUY' && signal.signal === 'SELL' && signal.confidence > 0.65) {
      return { exit: true, reason: 'Signal reversal' };
    }
    
    if (position.type === 'SELL' && signal.signal === 'BUY' && signal.confidence > 0.65) {
      return { exit: true, reason: 'Signal reversal' };
    }
    
    return { exit: false, reason: '' };
  }
  
  /**
   * Update strategy performance tracking
   */
  private updateStrategyPerformance(
    strategyPerformance: Map<string, StrategyPerformance>,
    trade: BacktestTrade
  ): void {
    const existing = strategyPerformance.get(trade.strategy);
    
    if (!existing) {
      strategyPerformance.set(trade.strategy, {
        strategy: trade.strategy,
        trades: 1,
        winRate: trade.pnl > 0 ? 100 : 0,
        totalReturn: trade.pnl,
        averageReturn: trade.pnl,
        maxDrawdown: trade.pnl < 0 ? Math.abs(trade.pnl) : 0,
      });
    } else {
      const wins = existing.winRate * existing.trades / 100;
      const newWins = wins + (trade.pnl > 0 ? 1 : 0);
      const newTrades = existing.trades + 1;
      
      strategyPerformance.set(trade.strategy, {
        strategy: trade.strategy,
        trades: newTrades,
        winRate: (newWins / newTrades) * 100,
        totalReturn: existing.totalReturn + trade.pnl,
        averageReturn: (existing.totalReturn + trade.pnl) / newTrades,
        maxDrawdown: Math.max(existing.maxDrawdown, trade.pnl < 0 ? Math.abs(trade.pnl) : 0),
      });
    }
  }
  
  /**
   * Calculate backtest metrics
   */
  private calculateMetrics(
    trades: BacktestTrade[],
    initialCapital: number,
    finalCapital: number,
    maxDrawdown: number
  ): Omit<BacktestResult, 'config' | 'trades' | 'equityCurve' | 'bestStrategy' | 'strategyBreakdown' | 'recommendations' | 'completedAt'> {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const totalReturn = finalCapital - initialCapital;
    const totalReturnPercent = (totalReturn / initialCapital) * 100;
    
    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    
    const averageLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    
    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map(t => t.pnl))
      : 0;
    
    const largestLoss = losingTrades.length > 0
      ? Math.abs(Math.min(...losingTrades.map(t => t.pnl)))
      : 0;
    
    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0;
    
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    
    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      initialCapital,
      finalCapital,
      totalReturn,
      totalReturnPercent,
      maxDrawdown,
      maxDrawdownPercent: (maxDrawdown / initialCapital) * 100,
      sharpeRatio,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
    };
  }
  
  /**
   * Find best performing strategy
   */
  private findBestStrategy(strategyPerformance: Map<string, StrategyPerformance>): string {
    let bestStrategy = 'None';
    let bestReturn = -Infinity;
    
    for (const [strategy, perf] of strategyPerformance.entries()) {
      if (perf.totalReturn > bestReturn) {
        bestReturn = perf.totalReturn;
        bestStrategy = strategy;
      }
    }
    
    return bestStrategy;
  }
  
  /**
   * Generate recommendations based on backtest results
   */
  private generateRecommendations(
    metrics: any,
    strategyPerformance: Map<string, StrategyPerformance>,
    config: BacktestConfig
  ): string[] {
    const recommendations: string[] = [];
    
    if (metrics.winRate < 40) {
      recommendations.push('⚠️ Low win rate - consider adjusting entry criteria or using different strategy');
    } else if (metrics.winRate > 60) {
      recommendations.push('✓ Good win rate - strategy shows promise');
    }
    
    if (metrics.totalReturnPercent < 0) {
      recommendations.push('⚠️ Negative returns - strategy not profitable in this period');
    } else if (metrics.totalReturnPercent > 20) {
      recommendations.push('✓ Strong returns - strategy performed well');
    }
    
    if (metrics.maxDrawdownPercent > 30) {
      recommendations.push('⚠️ High drawdown - consider tighter stop losses or smaller position sizes');
    }
    
    if (metrics.profitFactor < 1) {
      recommendations.push('⚠️ Profit factor below 1 - average losses exceed average wins');
    } else if (metrics.profitFactor > 2) {
      recommendations.push('✓ Excellent profit factor - wins significantly outweigh losses');
    }
    
    if (metrics.sharpeRatio > 1) {
      recommendations.push('✓ Good risk-adjusted returns (Sharpe > 1)');
    } else if (metrics.sharpeRatio < 0) {
      recommendations.push('⚠️ Negative risk-adjusted returns - strategy underperforms risk-free rate');
    }
    
    const bestPerf = Array.from(strategyPerformance.values())
      .sort((a, b) => b.totalReturn - a.totalReturn)[0];
    
    if (bestPerf && config.strategy === 'Auto') {
      recommendations.push(`✓ Best performing strategy: ${bestPerf.strategy} (${bestPerf.winRate.toFixed(1)}% win rate)`);
    }
    
    return recommendations;
  }
}
