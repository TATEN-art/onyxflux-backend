import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  EMAIL_SERVER: z.string(),
  EMAIL_PORT: z.string(),
  EMAIL_USER: z.string().email(),
  EMAIL_PASS: z.string(),
  EMAIL_FROM: z.string().email(),
  BACKEND_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  ADMIN_WALLET_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  ETH_RPC_URL: z.string().url(),
  POLYGON_RPC_URL: z.string().url(),
  BASE_RPC_URL: z.string().url(),
  ARBITRUM_RPC_URL: z.string().url(),
  OPTIMISM_RPC_URL: z.string().url(),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;
