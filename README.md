# OnyxFlux Backend

**Multi-chain Web3 API platform with integrated artificial intelligence**

OnyxFlux is a production-ready backend infrastructure that powers a comprehensive Web3 API platform featuring:
- Multi-chain RPC gateway (12+ chains)
- Nova Intelligence AI engine with price prediction
- Real-time whale detection and tracking
- Liquidity monitoring and health scoring
- Manipulation detection (spoofing, wash trading, pump & dump, rug pulls)
- User authentication with email OTP
- Subscription management with crypto payments
- API key management with rate limiting
- Real-time alerts via WebSocket, email, and webhooks
- Comprehensive analytics and dashboards

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis
- **Blockchain**: Ethers.js
- **Email**: SendGrid / Resend
- **Deployment**: Docker, PM2, Nginx

## Features

### Authentication
- Magic link / Email OTP login (no passwords)
- JWT-based sessions
- Automatic user registration on first login
- 5-day free trial for new users

### Subscription Plans
- **Free**: 100k requests, 0 Nova credits, 5-day trial
- **Starter**: 1M requests, 250 Nova credits ($99/month)
- **Pro**: 10M requests, 2500 Nova credits ($499/month)
- **Enterprise**: Unlimited requests, 10,000 Nova credits ($1999/month)

### Crypto Payments
Accept USDT/USDC on:
- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base

### API Key Management
- Generate, revoke, and rotate API keys
- Usage tracking per key
- Rate limiting per plan
- Secure hashed storage

### Multi-Chain RPC Gateway
Supported chains:
- Ethereum, Polygon, Arbitrum, Optimism, Base
- BSC, Avalanche, Fantom, Cronos
- Linea, Scroll, zkSync

Features:
- Auto-retry with failover
- Latency measurement
- Success rate tracking

### Nova Intelligence Engine

#### Price Prediction
Multiple models:
- ARIMA
- Holt-Winters
- Volatility clustering
- Whale-weight regression
- Liquidity delta model

Output:
- 1h, 4h, 24h predictions
- Confidence scores
- Reasoning explanations

#### Whale Detection (30-second cycles)
Classifications:
- Small whale: $250k+
- Medium whale: $500k+
- Mega whale: $1M+
- Institutional whale: $5M+

Features:
- Entity clustering
- Multi-wallet activity detection
- CEX movement tracking

#### Liquidity Monitoring (30-second cycles)
- Real-time liquidity tracking
- 24h volume estimation
- Health score calculation
- Low liquidity warnings

#### Manipulation Detection (30-second cycles)
Detects:
- Spoofing (fake walls)
- Wash trading
- Pump & dump patterns
- Rug pulls
- Coordinated whale actions

### Alert System
- In-dashboard alerts (stored in database)
- Real-time WebSocket stream
- Email notifications
- Webhook delivery with HMAC signatures

### Analytics
- System metrics (requests, latency, success rate)
- User metrics (usage, credits, plan details)
- Chain status monitoring
- Historical usage data

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd onyxflux-backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure `.env` with your settings (see Environment Variables section)

5. Generate Prisma client:
```bash
npm run prisma:generate
```

6. Run database migrations:
```bash
npm run prisma:migrate
```

7. Start development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Environment Variables

See `.env.example` for all required environment variables. Key variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/onyxflux

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# Email (SendGrid or Resend)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-key

# RPC Endpoints
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
# ... (see .env.example for all chains)

# Payment Wallet
PAYMENT_WALLET_ADDRESS=0xYourWalletAddress
```

## Deployment

### Docker Deployment

1. Build and start services:
```bash
docker-compose up -d
```

2. Run migrations:
```bash
docker-compose exec backend npx prisma migrate deploy
```

### VPS Deployment

See `DEPLOYMENT.md` for complete VPS deployment guide including:
- Server setup
- Docker installation
- Nginx configuration
- SSL certificate setup
- PM2 process management

## API Documentation

### Authentication

#### Send Verification Code
```http
POST /auth/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify Code
```http
POST /auth/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}
```

Response:
```json
{
  "token": "jwt-token-here"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

### API Keys

#### Generate API Key
```http
POST /api-keys
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My API Key"
}
```

Response:
```json
{
  "key": "ONYX-KEY-...",
  "prefix": "ONYX-KEY-abc123..."
}
```

#### List API Keys
```http
GET /api-keys
Authorization: Bearer {token}
```

### Multi-Chain RPC

#### Execute RPC Call
```http
POST /v1/rpc/{chain}
X-API-Key: ONYX-KEY-...
Content-Type: application/json

{
  "method": "eth_blockNumber",
  "params": []
}
```

### Nova Intelligence

#### Price Prediction
```http
POST /nova/predict
Authorization: Bearer {token}
Content-Type: application/json

{
  "tokenAddress": "0x...",
  "chain": "ethereum",
  "historicalData": [
    {"timestamp": 1234567890, "price": 100, "volume": 1000000}
  ]
}
```

#### Get Whale Activity
```http
GET /nova/whales/recent?limit=50
Authorization: Bearer {token}
```

#### Get Liquidity Data
```http
GET /nova/liquidity/{chain}/{token}
Authorization: Bearer {token}
```

#### Get Manipulation Events
```http
GET /nova/manipulation/recent?limit=50
Authorization: Bearer {token}
```

### Alerts

#### Get Alerts
```http
GET /alerts?limit=50
Authorization: Bearer {token}
```

#### WebSocket Stream
```
ws://localhost:3000/alerts/stream
```

### Webhooks

#### Create Webhook
```http
POST /webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook",
  "events": ["WHALE_BUY", "MANIPULATION_SPOOFING"]
}
```

### Analytics

#### System Metrics
```http
GET /metrics/system
```

#### User Metrics
```http
GET /metrics/user
Authorization: Bearer {token}
```

#### Usage Stats
```http
GET /metrics/usage
Authorization: Bearer {token}
```

## Project Structure

```
src/
├── auth/              # Authentication (email OTP, JWT)
├── users/             # User management
├── apiKeys/           # API key management
├── payments/          # Crypto payment monitoring
├── chains/            # Multi-chain RPC gateway
├── nova/              # Nova Intelligence Engine
│   ├── prediction/    # Price prediction models
│   ├── whales/        # Whale detection
│   ├── liquidity/     # Liquidity monitoring
│   └── manipulation/  # Manipulation detection
├── alerts/            # Alert system
├── webhooks/          # Webhook delivery
├── analytics/         # Analytics & metrics
├── middlewares/       # Auth, rate limiting, usage tracking
├── config/            # Configuration
├── utils/             # Utilities
└── server.ts          # Main server file
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## License

MIT

## Support

For issues, questions, or feature requests, please contact support@onyxflux.io
