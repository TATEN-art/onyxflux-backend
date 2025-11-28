import { WebSocket } from '@fastify/websocket';
import { logger } from '../utils/logger';
import { WebSocketClient, SubscriptionMessage, NovaEvent, WebSocketMessage } from './types';
import { prisma } from '../config/database';

class StreamManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private readonly PLAN_LIMITS = {
    free: { maxConnections: 0, maxSubscriptions: 0, messagesPerMinute: 0 },
    pro: { maxConnections: 3, maxSubscriptions: 10, messagesPerMinute: 100 },
    enterprise: { maxConnections: 10, maxSubscriptions: 50, messagesPerMinute: 1000 },
  };

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          const heartbeat: WebSocketMessage = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          };
          client.ws.send(JSON.stringify(heartbeat));
        } else {
          this.removeClient(clientId);
        }
      });
    }, 30000); // 30 seconds
  }

  async addClient(clientId: string, ws: WebSocket, userId: string, plan: string): Promise<boolean> {
    const planLimits = this.PLAN_LIMITS[plan as keyof typeof this.PLAN_LIMITS] || this.PLAN_LIMITS.free;

    if (planLimits.maxConnections === 0) {
      return false;
    }

    const userConnections = Array.from(this.clients.values()).filter(c => c.userId === userId).length;
    if (userConnections >= planLimits.maxConnections) {
      return false;
    }

    const client: WebSocketClient = {
      ws,
      userId,
      plan,
      subscriptions: new Set(),
      lastActivity: new Date(),
      messageCount: 0,
    };

    this.clients.set(clientId, client);
    logger.info(`WebSocket client connected: ${clientId} (user: ${userId}, plan: ${plan})`);

    return true;
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.forEach(subscription => {
        const subscribers = this.subscriptions.get(subscription);
        if (subscribers) {
          subscribers.delete(clientId);
          if (subscribers.size === 0) {
            this.subscriptions.delete(subscription);
          }
        }
      });

      this.clients.delete(clientId);
      logger.info(`WebSocket client disconnected: ${clientId}`);
    }
  }

  async subscribe(clientId: string, message: SubscriptionMessage): Promise<{ success: boolean; error?: string }> {
    const client = this.clients.get(clientId);
    if (!client) {
      return { success: false, error: 'Client not found' };
    }

    const planLimits = this.PLAN_LIMITS[client.plan as keyof typeof this.PLAN_LIMITS] || this.PLAN_LIMITS.free;

    if (client.subscriptions.size >= planLimits.maxSubscriptions) {
      return { success: false, error: 'Subscription limit reached for your plan' };
    }

    const subscriptionKey = `${message.chain}:${message.symbol}`;

    if (message.action === 'subscribe') {
      client.subscriptions.add(subscriptionKey);

      if (!this.subscriptions.has(subscriptionKey)) {
        this.subscriptions.set(subscriptionKey, new Set());
      }
      this.subscriptions.get(subscriptionKey)!.add(clientId);

      logger.info(`Client ${clientId} subscribed to ${subscriptionKey}`);
      return { success: true };
    } else if (message.action === 'unsubscribe') {
      client.subscriptions.delete(subscriptionKey);

      const subscribers = this.subscriptions.get(subscriptionKey);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(subscriptionKey);
        }
      }

      logger.info(`Client ${clientId} unsubscribed from ${subscriptionKey}`);
      return { success: true };
    }

    return { success: false, error: 'Invalid action' };
  }

  async broadcast(event: NovaEvent) {
    const subscriptionKey = `${event.chain}:${event.symbol}`;
    const subscribers = this.subscriptions.get(subscriptionKey);

    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'event',
      data: event,
      timestamp: new Date().toISOString(),
    };

    const messageStr = JSON.stringify(message);

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (!client) continue;

      const planLimits = this.PLAN_LIMITS[client.plan as keyof typeof this.PLAN_LIMITS] || this.PLAN_LIMITS.free;
      if (client.messageCount >= planLimits.messagesPerMinute) {
        continue;
      }

      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
          client.messageCount++;
          client.lastActivity = new Date();

          await this.logWebSocketMessage(client.userId, event.type, subscriptionKey);
        } catch (error) {
          logger.error(`Failed to send message to client ${clientId}`, error);
          this.removeClient(clientId);
        }
      }
    }

    setTimeout(() => {
      this.clients.forEach(client => {
        client.messageCount = 0;
      });
    }, 60000);
  }

  private async logWebSocketMessage(userId: string, eventType: string, subscription: string) {
    try {
      await prisma.requestLog.create({
        data: {
          userId,
          method: 'WS',
          path: `/ws/nova/v2/${subscription}`,
          statusCode: 200,
          latency: 0,
          ip: null,
          userAgent: `WebSocket:${eventType}`,
        },
      });
    } catch (error) {
      logger.error('Failed to log WebSocket message', error);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.clear();
    this.subscriptions.clear();
  }
}

export const streamManager = new StreamManager();
