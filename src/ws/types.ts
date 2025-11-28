import { WebSocket } from '@fastify/websocket';

export interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  plan: string;
  subscriptions: Set<string>;
  lastActivity: Date;
  messageCount: number;
}

export interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe';
  symbol: string;
  chain: string;
}

export interface PriceFeedEvent {
  type: 'price_update';
  symbol: string;
  chain: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: string;
}

export interface LiquidityShiftEvent {
  type: 'liquidity_shift';
  symbol: string;
  chain: string;
  liquidityChange: number;
  direction: 'increase' | 'decrease';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface WhaleMovementEvent {
  type: 'whale_movement';
  symbol: string;
  chain: string;
  amount: number;
  direction: 'buy' | 'sell';
  walletAddress: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface VolatilitySpikeEvent {
  type: 'volatility_spike';
  symbol: string;
  chain: string;
  volatilityIndex: number;
  priceSwing: number;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  timestamp: string;
}

export interface TrendDirectionEvent {
  type: 'trend_direction';
  symbol: string;
  chain: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number;
  timeframe: string;
  timestamp: string;
}

export interface RiskScoreEvent {
  type: 'risk_score';
  symbol: string;
  chain: string;
  riskScore: number;
  factors: {
    volatility: number;
    liquidity: number;
    manipulation: number;
    sentiment: number;
  };
  timestamp: string;
}

export interface AIPredictionEvent {
  type: 'ai_prediction';
  symbol: string;
  chain: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  targetPrice: number;
  timeframe: string;
  timestamp: string;
}

export interface MarketSentimentEvent {
  type: 'market_sentiment';
  symbol: string;
  chain: string;
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  score: number;
  sources: string[];
  timestamp: string;
}

export interface BreakoutAlertEvent {
  type: 'breakout_alert';
  symbol: string;
  chain: string;
  breakoutType: 'resistance' | 'support';
  price: number;
  level: number;
  confidence: number;
  timestamp: string;
}

export type NovaEvent =
  | PriceFeedEvent
  | LiquidityShiftEvent
  | WhaleMovementEvent
  | VolatilitySpikeEvent
  | TrendDirectionEvent
  | RiskScoreEvent
  | AIPredictionEvent
  | MarketSentimentEvent
  | BreakoutAlertEvent;

export interface WebSocketMessage {
  type: 'event' | 'error' | 'success' | 'heartbeat';
  data?: NovaEvent | { message: string };
  timestamp: string;
}
