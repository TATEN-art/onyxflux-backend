import { FastifyInstance } from 'fastify';
import { Logger } from '../utils/logger';
import { NovaV2Prediction } from './nova.engine';
import { TradingSignal } from './nova.signals';

const logger = new Logger('NovaWebSocketV2');

export interface WebSocketMessage {
  type: 'prediction' | 'signal' | 'alert' | 'candle' | 'price' | 'ping';
  data: unknown;
  timestamp: number;
}

export interface CandleData {
  symbol: string;
  chain: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface PriceUpdate {
  symbol: string;
  chain: string;
  price: number;
  change1m: number;
  change5m: number;
  change1h: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

export interface AlertMessage {
  type: 'whale' | 'liquidity' | 'volatility' | 'rugpull' | 'mev' | 'gas' | 'admin_wallet';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  symbol?: string;
  chain?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export class NovaWebSocketV2 {
  private connections: Map<string, any> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // connectionId -> Set of symbols
  
  /**
   * Initialize WebSocket server
   */
  initialize(fastify: FastifyInstance): void {
    logger.info('Initializing Nova V2 WebSocket server');
    
    fastify.get('/nova/v2/stream', { websocket: true }, (connection: any, req: any) => {
      const connectionId = this.generateConnectionId();
      
      logger.info(`Nova V2 WebSocket client connected: ${connectionId}`);
      
      this.connections.set(connectionId, connection);
      this.subscriptions.set(connectionId, new Set());
      
      this.sendMessage(connection, {
        type: 'ping',
        data: {
          message: 'Connected to Nova V2 Intelligence Engine',
          connectionId,
          version: '2.0.0',
        },
        timestamp: Date.now(),
      });
      
      connection.socket.on('message', (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(connectionId, connection, data);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });
      
      connection.socket.on('close', () => {
        logger.info(`Nova V2 WebSocket client disconnected: ${connectionId}`);
        this.connections.delete(connectionId);
        this.subscriptions.delete(connectionId);
      });
      
      const heartbeat = setInterval(() => {
        if (connection.socket.readyState === 1) {
          this.sendMessage(connection, {
            type: 'ping',
            data: { heartbeat: true },
            timestamp: Date.now(),
          });
        } else {
          clearInterval(heartbeat);
        }
      }, 30000);
    });
  }
  
  /**
   * Handle client messages (subscriptions, etc.)
   */
  private handleClientMessage(connectionId: string, connection: any, data: any): void {
    logger.debug(`Received message from ${connectionId}:`, data);
    
    switch (data.action) {
      case 'subscribe':
        this.handleSubscribe(connectionId, data.symbols || []);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscribe(connectionId, data.symbols || []);
        break;
      
      case 'ping':
        this.sendMessage(connection, {
          type: 'ping',
          data: { pong: true },
          timestamp: Date.now(),
        });
        break;
      
      default:
        logger.warn(`Unknown action: ${data.action}`);
    }
  }
  
  /**
   * Handle subscription requests
   */
  private handleSubscribe(connectionId: string, symbols: string[]): void {
    const subs = this.subscriptions.get(connectionId);
    if (!subs) return;
    
    for (const symbol of symbols) {
      subs.add(symbol.toLowerCase());
      logger.info(`${connectionId} subscribed to ${symbol}`);
    }
  }
  
  /**
   * Handle unsubscription requests
   */
  private handleUnsubscribe(connectionId: string, symbols: string[]): void {
    const subs = this.subscriptions.get(connectionId);
    if (!subs) return;
    
    for (const symbol of symbols) {
      subs.delete(symbol.toLowerCase());
      logger.info(`${connectionId} unsubscribed from ${symbol}`);
    }
  }
  
  /**
   * Broadcast Nova V2 prediction to all connected clients
   */
  broadcastPrediction(
    symbol: string,
    chain: string,
    prediction: NovaV2Prediction
  ): void {
    const message: WebSocketMessage = {
      type: 'prediction',
      data: {
        symbol,
        chain,
        prediction,
      },
      timestamp: Date.now(),
    };
    
    this.broadcastToSubscribers(symbol, message);
  }
  
  /**
   * Broadcast trading signal to all connected clients
   */
  broadcastSignal(
    symbol: string,
    chain: string,
    signal: TradingSignal
  ): void {
    const message: WebSocketMessage = {
      type: 'signal',
      data: {
        symbol,
        chain,
        signal,
      },
      timestamp: Date.now(),
    };
    
    this.broadcastToSubscribers(symbol, message);
  }
  
  /**
   * Broadcast alert to all connected clients
   */
  broadcastAlert(alert: AlertMessage): void {
    const message: WebSocketMessage = {
      type: 'alert',
      data: alert,
      timestamp: Date.now(),
    };
    
    this.broadcastToAll(message);
  }
  
  /**
   * Broadcast candle data to subscribers
   */
  broadcastCandle(candle: CandleData): void {
    const message: WebSocketMessage = {
      type: 'candle',
      data: candle,
      timestamp: Date.now(),
    };
    
    this.broadcastToSubscribers(candle.symbol, message);
  }
  
  /**
   * Broadcast price update to subscribers
   */
  broadcastPrice(priceUpdate: PriceUpdate): void {
    const message: WebSocketMessage = {
      type: 'price',
      data: priceUpdate,
      timestamp: Date.now(),
    };
    
    this.broadcastToSubscribers(priceUpdate.symbol, message);
  }
  
  /**
   * Broadcast to all subscribers of a symbol
   */
  private broadcastToSubscribers(symbol: string, message: WebSocketMessage): void {
    const symbolLower = symbol.toLowerCase();
    let sentCount = 0;
    
    for (const [connectionId, connection] of this.connections.entries()) {
      const subs = this.subscriptions.get(connectionId);
      
      if (subs && (subs.has(symbolLower) || subs.has('*'))) {
        this.sendMessage(connection, message);
        sentCount++;
      }
    }
    
    if (sentCount > 0) {
      logger.debug(`Broadcasted ${message.type} for ${symbol} to ${sentCount} clients`);
    }
  }
  
  /**
   * Broadcast to all connected clients
   */
  private broadcastToAll(message: WebSocketMessage): void {
    let sentCount = 0;
    
    for (const connection of this.connections.values()) {
      this.sendMessage(connection, message);
      sentCount++;
    }
    
    logger.debug(`Broadcasted ${message.type} to ${sentCount} clients`);
  }
  
  /**
   * Send message to specific connection
   */
  private sendMessage(connection: any, message: WebSocketMessage): void {
    try {
      if (connection.socket.readyState === 1) {
        connection.socket.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error('Error sending WebSocket message:', error);
    }
  }
  
  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `nova-v2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    totalSubscriptions: number;
    subscriptionsBySymbol: Record<string, number>;
  } {
    const subscriptionsBySymbol: Record<string, number> = {};
    let totalSubscriptions = 0;
    
    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.size;
      
      for (const symbol of subs) {
        subscriptionsBySymbol[symbol] = (subscriptionsBySymbol[symbol] || 0) + 1;
      }
    }
    
    return {
      totalConnections: this.connections.size,
      totalSubscriptions,
      subscriptionsBySymbol,
    };
  }
  
  /**
   * Close all connections
   */
  closeAll(): void {
    logger.info('Closing all Nova V2 WebSocket connections');
    
    for (const connection of this.connections.values()) {
      try {
        connection.socket.close();
      } catch (error) {
        logger.error('Error closing connection:', error);
      }
    }
    
    this.connections.clear();
    this.subscriptions.clear();
  }
}
