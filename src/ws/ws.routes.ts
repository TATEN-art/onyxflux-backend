import { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { streamManager } from './streamManager';
import { SubscriptionMessage, WebSocketMessage } from './types';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

const SubscriptionSchema = z.object({
  action: z.enum(['subscribe', 'unsubscribe']),
  symbol: z.string().min(1).max(20),
  chain: z.string().min(1).max(50),
});

export const wsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/nova/v2', { websocket: true }, async (connection, request) => {
    const clientId = nanoid();
    let userId: string | null = null;
    let userPlan = 'free';

    try {
      const token = (request.query as any).token || request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        const errorMessage: WebSocketMessage = {
          type: 'error',
          data: { message: 'Authentication required. Provide token in query params or Authorization header.' },
          timestamp: new Date().toISOString(),
        };
        connection.socket.send(JSON.stringify(errorMessage));
        connection.socket.close();
        return;
      }

      try {
        const decoded = fastify.jwt.verify(token) as { userId: string };
        userId = decoded.userId;

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, plan: true, planExpiry: true },
        });

        if (!user) {
          throw new Error('User not found');
        }

        if (user.planExpiry && new Date(user.planExpiry) < new Date()) {
          userPlan = 'free';
        } else {
          userPlan = user.plan;
        }

        if (userPlan === 'free') {
          const errorMessage: WebSocketMessage = {
            type: 'error',
            data: { message: 'WebSocket streaming is only available for Pro and Enterprise plans.' },
            timestamp: new Date().toISOString(),
          };
          connection.socket.send(JSON.stringify(errorMessage));
          connection.socket.close();
          return;
        }
      } catch (error) {
        const errorMessage: WebSocketMessage = {
          type: 'error',
          data: { message: 'Invalid or expired token' },
          timestamp: new Date().toISOString(),
        };
        connection.socket.send(JSON.stringify(errorMessage));
        connection.socket.close();
        return;
      }

      const added = await streamManager.addClient(clientId, connection.socket, userId, userPlan);

      if (!added) {
        const errorMessage: WebSocketMessage = {
          type: 'error',
          data: { message: 'Connection limit reached for your plan' },
          timestamp: new Date().toISOString(),
        };
        connection.socket.send(JSON.stringify(errorMessage));
        connection.socket.close();
        return;
      }

      const welcomeMessage: WebSocketMessage = {
        type: 'success',
        data: {
          message: `Connected to OnyxFlux Nova V2 WebSocket. Plan: ${userPlan}. Send subscription messages to start receiving events.`,
        },
        timestamp: new Date().toISOString(),
      };
      connection.socket.send(JSON.stringify(welcomeMessage));

      connection.socket.on('message', async (rawMessage: Buffer) => {
        try {
          const messageStr = rawMessage.toString();
          const message = JSON.parse(messageStr);

          const validatedMessage = SubscriptionSchema.parse(message) as SubscriptionMessage;

          const result = await streamManager.subscribe(clientId, validatedMessage);

          const response: WebSocketMessage = {
            type: result.success ? 'success' : 'error',
            data: {
              message: result.success
                ? `Successfully ${validatedMessage.action}d to ${validatedMessage.chain}:${validatedMessage.symbol}`
                : result.error || 'Subscription failed',
            },
            timestamp: new Date().toISOString(),
          };

          connection.socket.send(JSON.stringify(response));
        } catch (error) {
          logger.error('WebSocket message error', error);
          const errorMessage: WebSocketMessage = {
            type: 'error',
            data: {
              message: error instanceof Error ? error.message : 'Invalid message format',
            },
            timestamp: new Date().toISOString(),
          };
          connection.socket.send(JSON.stringify(errorMessage));
        }
      });

      connection.socket.on('close', () => {
        streamManager.removeClient(clientId);
      });

      connection.socket.on('error', (error: Error) => {
        logger.error(`WebSocket error for client ${clientId}`, error);
        streamManager.removeClient(clientId);
      });
    } catch (error) {
      logger.error('WebSocket connection error', error);
      connection.socket.close();
    }
  });

  fastify.get('/stats', async (request, reply) => {
    return {
      clients: streamManager.getClientCount(),
      subscriptions: streamManager.getSubscriptionCount(),
      timestamp: new Date().toISOString(),
    };
  });
};
