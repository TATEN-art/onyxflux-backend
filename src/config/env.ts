import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@onyxflux.io',
    alertsFrom: process.env.ALERTS_EMAIL_FROM || 'alerts@onyxflux.io',
    whaleFrom: process.env.WHALE_EMAIL_FROM || 'whaleactivity@onyxflux.io',
  },
  rpc: {
    ethereum: process.env.RPC_ETHEREUM || '',
    polygon: process.env.RPC_POLYGON || '',
    arbitrum: process.env.RPC_ARBITRUM || '',
    optimism: process.env.RPC_OPTIMISM || '',
    base: process.env.RPC_BASE || '',
    bsc: process.env.RPC_BSC || '',
    avalanche: process.env.RPC_AVALANCHE || '',
    fantom: process.env.RPC_FANTOM || '',
    cronos: process.env.RPC_CRONOS || '',
    linea: process.env.RPC_LINEA || '',
    scroll: process.env.RPC_SCROLL || '',
    zksync: process.env.RPC_ZKSYNC || '',
  },
  payment: {
    walletAddress: process.env.PAYMENT_WALLET_ADDRESS || '',
    contracts: {
      usdt: {
        ethereum: process.env.USDT_CONTRACT_ETH || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        polygon: process.env.USDT_CONTRACT_POLYGON || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        arbitrum: process.env.USDT_CONTRACT_ARBITRUM || '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        base: process.env.USDT_CONTRACT_BASE || '',
        optimism: process.env.USDT_CONTRACT_OPTIMISM || '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      },
      usdc: {
        ethereum: process.env.USDC_CONTRACT_ETH || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        polygon: process.env.USDC_CONTRACT_POLYGON || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        arbitrum: process.env.USDC_CONTRACT_ARBITRUM || '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        base: process.env.USDC_CONTRACT_BASE || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        optimism: process.env.USDC_CONTRACT_OPTIMISM || '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
      },
    },
  },
  pricing: {
    starter: parseInt(process.env.PRICE_STARTER || '99'),
    pro: parseInt(process.env.PRICE_PRO || '499'),
    enterprise: parseInt(process.env.PRICE_ENTERPRISE || '1999'),
  },
  rateLimits: {
    free: parseInt(process.env.RATE_LIMIT_FREE || '100'),
    starter: parseInt(process.env.RATE_LIMIT_STARTER || '1000'),
    pro: parseInt(process.env.RATE_LIMIT_PRO || '5000'),
    enterprise: parseInt(process.env.RATE_LIMIT_ENTERPRISE || '50000'),
  },
  nova: {
    enabled: process.env.NOVA_ENABLED === 'true',
    scanInterval: parseInt(process.env.NOVA_SCAN_INTERVAL || '30000'),
    whaleScanInterval: parseInt(process.env.WHALE_SCAN_INTERVAL || '30000'),
    liquidityScanInterval: parseInt(process.env.LIQUIDITY_SCAN_INTERVAL || '30000'),
    manipulationScanInterval: parseInt(process.env.MANIPULATION_SCAN_INTERVAL || '30000'),
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '3001'),
    path: process.env.WS_PATH || '/alerts/stream',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  },
  deployment: {
    domain: process.env.DOMAIN || 'api.onyxflux.io',
    sslEmail: process.env.SSL_EMAIL || 'admin@onyxflux.io',
  },
};
