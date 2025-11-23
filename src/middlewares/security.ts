import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { Logger } from '../utils/logger';

const logger = new Logger('Security');

/**
 * XSS Protection Middleware
 * Sanitizes user input to prevent XSS attacks
 */
export function xssProtection(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (request.body && typeof request.body === 'object') {
    sanitizeObject(request.body);
  }
  
  if (request.query && typeof request.query === 'object') {
    sanitizeObject(request.query);
  }
  
  done();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Input Validation Middleware
 * Validates common input patterns
 */
export function validateInput(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (request.body && typeof request.body === 'object') {
    try {
      validateObjectInputs(request.body);
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Invalid input',
        message: error.message,
      });
    }
  }
  
  done();
}

function validateObjectInputs(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      if (containsSQLInjection(obj[key])) {
        throw new Error(`Potential SQL injection detected in field: ${key}`);
      }
      
      if (containsCommandInjection(obj[key])) {
        throw new Error(`Potential command injection detected in field: ${key}`);
      }
      
      if (obj[key].length > 10000) {
        throw new Error(`Field ${key} exceeds maximum length`);
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      validateObjectInputs(obj[key]);
    }
  }
}

function containsSQLInjection(str: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(--|\#|\/\*|\*\/)/g,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(str));
}

function containsCommandInjection(str: string): boolean {
  const commandPatterns = [
    /[;&|`$()]/g,
    /(bash|sh|cmd|powershell|eval|exec)/gi,
  ];
  
  return commandPatterns.some(pattern => pattern.test(str));
}

/**
 * Anti-Abuse Filter Middleware
 * Detects and blocks abusive behavior
 */
export async function antiAbuseFilter(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).user?.userId;
  const ip = request.ip;
  
  if (!userId && !ip) {
    return;
  }
  
  const key = userId || ip;
  const now = Date.now();
  
  if (!requestTracker.has(key)) {
    requestTracker.set(key, []);
  }
  
  const requests = requestTracker.get(key)!;
  
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 100) {
    logger.warn(`Rate limit exceeded for ${key}`);
    return reply.code(429).send({
      error: 'Too many requests',
      message: 'Please slow down and try again later',
    });
  }
  
  recentRequests.push(now);
  requestTracker.set(key, recentRequests);
}

const requestTracker = new Map<string, number[]>();

/**
 * HMAC Signature Validation
 * Validates webhook signatures
 */
export function validateHMACSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Webhook Signature Middleware
 */
export function validateWebhookSignature(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const signature = request.headers['x-signature'] as string;
  
  if (!signature) {
    return reply.code(401).send({
      error: 'Missing signature',
    });
  }
  
  const payload = JSON.stringify(request.body);
  const secret = process.env.WEBHOOK_SECRET || 'default-secret';
  
  if (!validateHMACSignature(payload, signature, secret)) {
    return reply.code(401).send({
      error: 'Invalid signature',
    });
  }
  
  done();
}

/**
 * API Key Encryption/Decryption
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export function encryptAPIKey(apiKey: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decryptAPIKey(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Secure Headers Middleware
 */
export function secureHeaders(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  reply.header('Content-Security-Policy', "default-src 'self'");
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  done();
}

/**
 * Audit Log System
 */
export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  metadata?: any;
}

const auditLogs: AuditLogEntry[] = [];

export function logAuditEvent(entry: AuditLogEntry): void {
  auditLogs.push(entry);
  
  logger.info('Audit Log:', {
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    ip: entry.ip,
    timestamp: entry.timestamp,
  });
  
  if (auditLogs.length > 10000) {
    auditLogs.shift();
  }
}

export function getAuditLogs(filters?: {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}): AuditLogEntry[] {
  let filtered = auditLogs;
  
  if (filters?.userId) {
    filtered = filtered.filter(log => log.userId === filters.userId);
  }
  
  if (filters?.action) {
    filtered = filtered.filter(log => log.action === filters.action);
  }
  
  if (filters?.resource) {
    filtered = filtered.filter(log => log.resource === filters.resource);
  }
  
  if (filters?.startDate) {
    filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
  }
  
  if (filters?.endDate) {
    filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
  }
  
  return filtered;
}

/**
 * Audit Middleware
 */
export function auditMiddleware(action: string, resource: string) {
  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const userId = (request as any).user?.userId;
    const resourceId = (request.params as any)?.id;
    
    logAuditEvent({
      userId,
      action,
      resource,
      resourceId,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      metadata: {
        method: request.method,
        url: request.url,
      },
    });
    
    done();
  };
}
