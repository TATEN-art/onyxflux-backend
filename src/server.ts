import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import Redis from 'ioredis';
import env from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { authRoutes } from './auth/auth.routes';
import { apiKeyRoutes } from './apiKeys/apiKeys.routes';
import { billingRoutes } from './billing/billing.routes';
import { analyticsRoutes } from './users/analytics.routes';
import { wsRoutes } from './ws/ws.routes';
import { AuthenticatedUser } from './middlewares/auth';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthenticatedUser;
  }
}

const redis = new Redis(env.REDIS_URL);

const fastify = Fastify({
  logger: false,
});

fastify.setErrorHandler(errorHandler);

async function start() {
  try {
    await fastify.register(cors, {
      origin: env.FRONTEND_URL,
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: env.JWT_SECRET,
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      redis,
      keyGenerator: (request) => {
        return request.headers['x-api-key'] as string || request.ip;
      },
    });

    await fastify.register(websocket);

    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    await fastify.register(authRoutes, { prefix: '/auth' });
    await fastify.register(apiKeyRoutes, { prefix: '/api-keys' });
    await fastify.register(billingRoutes, { prefix: '/billing' });
    await fastify.register(analyticsRoutes, { prefix: '/analytics' });
    await fastify.register(wsRoutes, { prefix: '/ws' });

    const port = parseInt(env.PORT);
    await fastify.listen({ port, host: '0.0.0.0' });

    logger.info(`🚀 OnyxFlux Backend running on port ${port}`);
    logger.info(`📊 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Frontend URL: ${env.FRONTEND_URL}`);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
