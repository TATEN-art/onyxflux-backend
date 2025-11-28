export interface TokenData {
  symbol: string;
  chain: string;
  address: string;
  price: number;
  volume24h: number;
  change24h: number;
  liquidity: number;
  timestamp: Date;
}

export interface WhaleTransaction {
  symbol: string;
  chain: string;
  walletAddress: string;
  amount: number;
  direction: 'buy' | 'sell';
  impact: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface LiquidityData {
  symbol: string;
  chain: string;
  poolAddress: string;
  liquidity: number;
  liquidityChange: number;
  direction: 'increase' | 'decrease';
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface VolatilityData {
  symbol: string;
  chain: string;
  volatilityIndex: number;
  priceSwing: number;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  timestamp: Date;
}

export interface MempoolTransaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  gasPrice: number;
  timestamp: Date;
}

export interface TrendData {
  symbol: string;
  chain: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  timeframe: string;
  timestamp: Date;
}

export interface RiskData {
  symbol: string;
  chain: string;
  riskScore: number;
  factors: {
    volatility: number;
    liquidity: number;
    manipulation: number;
    sentiment: number;
  };
  timestamp: Date;
}

export interface PredictionData {
  symbol: string;
  chain: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  targetPrice: number;
  timeframe: string;
  reasoning: string;
  timestamp: Date;
}

export interface MarketSentiment {
  symbol: string;
  chain: string;
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  score: number;
  sources: string[];
  timestamp: Date;
}

export interface NovaInsight {
  symbol: string;
  chain: string;
  currentTrend: TrendData;
  riskScore: RiskData;
  prediction: PredictionData;
  whaleSentiment: 'accumulating' | 'distributing' | 'neutral';
  marketSentiment: MarketSentiment;
  recentEvents: any[];
  timestamp: Date;
}
