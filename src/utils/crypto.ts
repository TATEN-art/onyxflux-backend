import crypto from 'crypto';

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(prefix: string = 'of'): { key: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = `${prefix}_${randomBytes}`;
  const hash = hashApiKey(key);
  
  return {
    key,
    hash,
    prefix: key.substring(0, 8),
  };
}
