export type BotChain = 'ethereum' | 'base' | 'bnb' | 'solana';

export type BotStrategy =
  | 'trend_following'
  | 'breakout'
  | 'scalping'
  | 'momentum'
  | 'reversal'
  | 'whale_tracking'
  | 'sideways_accumulation';

export type BotRiskLevel = 'low' | 'medium' | 'high';

export type BotSignalType = 'buy' | 'sell' | 'hold';

export interface BotConfig {
  chain: BotChain;
  tokenAddress: string;
  tokenSymbol?: string;
  strategy: BotStrategy;
  riskLevel: BotRiskLevel;
  evaluationInterval: number;
  maxCapitalAllocation: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  enableNotifications: boolean;
}

export interface BotSignal {
  id: string;
  botId: string;
  signalType: BotSignalType;
  confidence: number;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  capitalAllocation: number | null;
  reasoning: string | null;
  novaData: NovaSignalData;
  createdAt: Date;
}

export interface NovaSignalData {
  trend: string;
  trendStrength: number;
  riskScore: number;
  volatilityIndex: number;
  liquidityDirection: string;
  whaleActivity: string;
  marketSentiment: string;
  prediction: string;
  predictionConfidence: number;
  targetPrice: number | null;
}

export interface BotCreateInput {
  name: string;
  chain: BotChain;
  tokenAddress: string;
  strategy: BotStrategy;
  riskLevel: BotRiskLevel;
  enableNotifications?: boolean;
}

export interface BotUpdateInput {
  name?: string;
  strategy?: BotStrategy;
  riskLevel?: BotRiskLevel;
  isActive?: boolean;
  enableNotifications?: boolean;
}

export interface BotEvaluationResult {
  signal: BotSignalType;
  confidence: number;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  capitalAllocation: number;
  reasoning: string;
  novaData: NovaSignalData;
}

export interface BotAuditLog {
  id: string;
  botId: string;
  action: string;
  details: any;
  createdAt: Date;
}

export interface BotWithSignals {
  id: string;
  userId: string;
  name: string;
  chain: BotChain;
  tokenAddress: string;
  tokenSymbol: string | null;
  strategy: BotStrategy;
  riskLevel: BotRiskLevel;
  isActive: boolean;
  config: BotConfig;
  createdAt: Date;
  updatedAt: Date;
  signals: BotSignal[];
  latestSignal?: BotSignal;
}

export const STRATEGY_DESCRIPTIONS: Record<BotStrategy, string> = {
  trend_following: 'Follow established market trends with momentum confirmation',
  breakout: 'Detect and trade breakout patterns with volume confirmation',
  scalping: 'Quick trades on small price movements with tight stops',
  momentum: 'Trade strong momentum moves with whale activity confirmation',
  reversal: 'Identify trend reversals using volatility and sentiment signals',
  whale_tracking: 'Follow whale movements and accumulation patterns',
  sideways_accumulation: 'Accumulate during low volatility sideways markets',
};

export const RISK_LEVEL_CONFIG: Record<
  BotRiskLevel,
  {
    maxCapitalAllocation: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
    minConfidence: number;
  }
> = {
  low: {
    maxCapitalAllocation: 2,
    stopLossPercentage: 2,
    takeProfitPercentage: 5,
    minConfidence: 75,
  },
  medium: {
    maxCapitalAllocation: 3.5,
    stopLossPercentage: 3,
    takeProfitPercentage: 8,
    minConfidence: 65,
  },
  high: {
    maxCapitalAllocation: 5,
    stopLossPercentage: 5,
    takeProfitPercentage: 12,
    minConfidence: 55,
  },
};
