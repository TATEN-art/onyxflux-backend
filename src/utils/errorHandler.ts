import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.message,
    });
  }

  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.message,
    });
  }

  return reply.status(500).send({
    success: false,
    error: 'Internal server error',
  });
};
