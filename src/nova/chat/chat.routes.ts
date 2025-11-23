import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../utils/logger';
import { NovaChatService, ChatRequest } from './chat.service';
import { auditMiddleware } from '../../middlewares/security';

const logger = new Logger('NovaChatRoutes');

export async function novaChatRoutes(fastify: FastifyInstance) {
  const chatService = new NovaChatService();
  
  /**
   * POST /api/nova/chat
   * Chat with Nova AI assistant
   */
  fastify.post('/api/nova/chat', {
    preHandler: [
      fastify.authenticate,
      auditMiddleware('chat', 'nova'),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as ChatRequest;
      
      if (!body.message || typeof body.message !== 'string') {
        return reply.code(400).send({
          error: 'Message is required',
        });
      }
      
      if (body.message.length > 1000) {
        return reply.code(400).send({
          error: 'Message is too long (max 1000 characters)',
        });
      }
      
      const response = await chatService.processMessage(body);
      
      if (!response.isCryptoRelated) {
        return reply.code(400).send({
          error: response.response,
        });
      }
      
      return reply.send({
        success: true,
        response: response.response,
      });
    } catch (error: any) {
      logger.error('Error processing chat message:', error);
      
      return reply.code(500).send({
        error: 'Failed to process message',
        message: error.message,
      });
    }
  });
  
  logger.info('Nova chat routes registered');
}
