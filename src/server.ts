import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config/env';
import { Logger } from './utils/logger';
import prisma from './config/database';
import redis from './config/redis';

import { authRoutes } from './auth/auth.routes';
import { usersRoutes } from './users/users.routes';
import { apiKeysRoutes } from './apiKeys/apiKeys.routes';
import { paymentsRoutes } from './payments/payments.routes';
import { PaymentsService } from './payments/payments.service';
import { chainsRoutes } from './chains/chains.routes';
import { ChainsService } from './chains/chains.service';
import { novaRoutes } from './nova/nova.routes';
import { WhalesService } from './nova/whales/whales.service';
import { LiquidityService } from './nova/liquidity/liquidity.service';
import { ManipulationService } from './nova/manipulation/manipulation.service';
import { alertsRoutes } from './alerts/alerts.routes';
import { webhooksRoutes } from './webhooks/webhooks.routes';
import { analyticsRoutes } from './analytics/analytics.routes';
import { AnalyticsService } from './analytics/analytics.service';

const logger = new Logger('Server');

const fastify = Fastify({
  logger: config.server.nodeEnv === 'development',
});

const chainsService = new ChainsService();
const whalesService = new WhalesService(chainsService);
const liquidityService = new LiquidityService(chainsService);
const manipulationService = new ManipulationService(chainsService);
const analyticsService = new AnalyticsService(chainsService);
const paymentsService = new PaymentsService();

async function start() {
  try {
    await fastify.register(cors, {
      origin: config.cors.origin,
      credentials: true,
    });

    await fastify.register(websocket);

    fastify.get('/', async (_request, reply) => {
      return reply.send({
        name: 'OnyxFlux API',
        version: '1.0.0',
        status: 'operational',
        documentation: '/docs',
      });
    });

    await fastify.register(authRoutes);
    await fastify.register(usersRoutes);
    await fastify.register(apiKeysRoutes);
    await fastify.register(paymentsRoutes);
    await fastify.register(chainsRoutes);
    await fastify.register(async (instance) => {
      await novaRoutes(instance, whalesService, liquidityService, manipulationService);
    });
    await fastify.register(alertsRoutes);
    await fastify.register(webhooksRoutes);
    await fastify.register(async (instance) => {
      await analyticsRoutes(instance, analyticsService);
    });

    fastify.get('/alerts/stream', { websocket: true }, (connection, _req) => {
      logger.info('WebSocket client connected');

      connection.socket.on('message', (message) => {
        logger.debug('WebSocket message received:', message.toString());
      });

      connection.socket.on('close', () => {
        logger.info('WebSocket client disconnected');
      });

      setInterval(() => {
        if (connection.socket.readyState === 1) {
          connection.socket.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
          }));
        }
      }, 30000);
    });

    if (config.nova.enabled) {
      logger.info('Starting Nova Intelligence services...');
      whalesService.startScanning();
      liquidityService.startScanning();
      manipulationService.startScanning();
    }

    paymentsService.startPaymentMonitoring();

    setInterval(async () => {
      await analyticsService.recordSystemMetrics();
    }, 60000);

    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
    logger.info(`Environment: ${config.server.nodeEnv}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  whalesService.stopScanning();
  liquidityService.stopScanning();
  manipulationService.stopScanning();
  
  await fastify.close();
  await prisma.$disconnect();
  await redis.quit();
  
  process.exit(0);
});

start();
