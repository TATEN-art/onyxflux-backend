import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function compareApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

export function generateApiKey(): string {
  const randomString = crypto.randomBytes(32).toString('hex');
  return `ONYX-KEY-${randomString}`;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
