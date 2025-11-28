import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middlewares/auth';
import { priceFeedService } from './ingestion/priceFeed';
import { liquidityFeedService } from './ingestion/liquidityFeed';
import { whaleFeedService } from './ingestion/whaleFeed';
import { volatilityFeedService } from './ingestion/volatilityFeed';
import { eventProcessor } from './engine/eventProcessor';
import { riskScoreEngine } from './engine/riskScore';
import { trendClassifier } from './engine/trendClassifier';
import { predictionEngine } from './engine/prediction';
import { NovaInsight } from './types';
import { logger } from '../utils/logger';

interface NovaInsightsQuery {
  token: string;
  chain?: 'ethereum' | 'base';
}

export async function novaRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: NovaInsightsQuery }>(
    '/nova/insights',
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Querystring: NovaInsightsQuery }>, reply: FastifyReply) => {
      try {
        const { token, chain = 'ethereum' } = request.query;

        if (!token) {
          return reply.code(400).send({
            error: 'Missing required parameter: token',
          });
        }

        if (chain !== 'ethereum' && chain !== 'base') {
          return reply.code(400).send({
            error: 'Invalid chain. Must be "ethereum" or "base"',
          });
        }

        logger.info(`Fetching Nova insights for ${token} on ${chain}`);

        const [tokenData, whaleActivity] = await Promise.all([
          priceFeedService.getTokenPrice(token, chain),
          whaleFeedService.getWhaleActivity(token, chain, 60),
        ]);

        if (!tokenData) {
          return reply.code(404).send({
            error: 'Token not found or unable to fetch price data',
          });
        }

        const poolAddress = `${token}:pool`;
        const liquidityData = await liquidityFeedService.getPoolLiquidity(
          poolAddress,
          tokenData.symbol,
          chain
        );

        volatilityFeedService.addPricePoint(tokenData.symbol, chain, tokenData.price);
        const volatilityData = volatilityFeedService.calculateVolatility(tokenData.symbol, chain);

        const currentTrend = trendClassifier.classifyTrend(
          tokenData.symbol,
          chain,
          tokenData,
          liquidityData,
          volatilityData,
          whaleActivity
        );

        const riskScore = riskScoreEngine.calculateRiskScore(
          tokenData.symbol,
          chain,
          tokenData,
          liquidityData,
          volatilityData,
          whaleActivity
        );

        const prediction = predictionEngine.generatePrediction(
          tokenData.symbol,
          chain,
          currentTrend,
          volatilityData,
          tokenData,
          whaleActivity
        );

        const whaleSentiment = this.determineWhaleSentiment(whaleActivity);

        const marketSentimentData = eventProcessor.processMarketSentiment(
          tokenData.symbol,
          chain,
          tokenData,
          whaleActivity
        );

        const recentEvents = eventProcessor.getEventHistory(tokenData.symbol, chain, 5);

        const insight: NovaInsight = {
          symbol: tokenData.symbol,
          chain,
          currentTrend,
          riskScore,
          prediction,
          whaleSentiment,
          marketSentiment: {
            symbol: tokenData.symbol,
            chain,
            sentiment: marketSentimentData.sentiment,
            score: marketSentimentData.score,
            sources: marketSentimentData.sources,
            timestamp: new Date(),
          },
          recentEvents,
          timestamp: new Date(),
        };

        logger.info(`Nova insights generated for ${tokenData.symbol} on ${chain}`);

        return reply.code(200).send(insight);
      } catch (error) {
        logger.error('Error generating Nova insights:', error);
        return reply.code(500).send({
          error: 'Failed to generate Nova insights',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  fastify.get(
    '/nova/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.code(200).send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          priceFeed: 'active',
          liquidityFeed: 'active',
          whaleFeed: 'active',
          volatilityFeed: 'active',
          mempoolFeed: 'active',
        },
      });
    }
  );
}

function determineWhaleSentiment(
  whaleActivity: any[]
): 'accumulating' | 'distributing' | 'neutral' {
  if (whaleActivity.length === 0) return 'neutral';

  const recentWhales = whaleActivity.slice(-10);
  const buyCount = recentWhales.filter((w) => w.direction === 'buy').length;
  const sellCount = recentWhales.filter((w) => w.direction === 'sell').length;

  if (buyCount > sellCount * 1.5) return 'accumulating';
  if (sellCount > buyCount * 1.5) return 'distributing';
  return 'neutral';
}
