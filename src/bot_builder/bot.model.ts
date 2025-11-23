/**
 * Bot Builder Model Types
 * 
 * This file contains TypeScript interfaces for the Bot Builder system.
 * The actual Prisma model is defined in prisma/schema.prisma
 */

export interface BotConfig {
  id: string;
  userId: string;
  token: string;
  chain: string;
  framework: 'Nova V2' | 'Nova V1' | 'Custom';
  strategy: 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following';
  novaConfidence: number;
  novaPredictions: NovaPredictions;
  riskLevel: 'low' | 'medium' | 'high';
  notificationsEnabled: boolean;
  status: 'active' | 'paused' | 'stopped';
  createdAt: Date;
  updatedAt: Date;
}

export interface NovaPredictions {
  predicted_1m?: number;
  predicted_5m?: number;
  predicted_15m?: number;
  predicted_1h?: number;
  predicted_24h?: number;
  direction_1m?: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_5m?: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_15m?: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_1h?: 'UP' | 'DOWN' | 'SIDEWAYS';
  direction_24h?: 'UP' | 'DOWN' | 'SIDEWAYS';
  confidence?: number;
  lastUpdated?: number;
}

export interface BotSignal {
  id: string;
  botId: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  confidence: number;
  price: number;
  reasoning: string[];
  timestamp: number;
  executed: boolean;
}

export interface BotPerformance {
  botId: string;
  totalSignals: number;
  successfulSignals: number;
  failedSignals: number;
  successRate: number;
  averageConfidence: number;
  lastSignalTime: number;
}

export interface CreateBotRequest {
  token: string;
  chain: string;
  framework?: 'Nova V2' | 'Nova V1' | 'Custom';
  strategy?: 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following';
  riskLevel?: 'low' | 'medium' | 'high';
  notificationsEnabled?: boolean;
}

export interface UpdateBotRequest {
  strategy?: 'Breakout' | 'Scalper' | 'Whale Momentum' | 'Swing' | 'Range Trading' | 'Trend Following';
  riskLevel?: 'low' | 'medium' | 'high';
  notificationsEnabled?: boolean;
  status?: 'active' | 'paused' | 'stopped';
}

export interface BotWithSignals extends BotConfig {
  recentSignals: BotSignal[];
  performance: BotPerformance;
}
