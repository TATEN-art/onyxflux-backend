# OnyxFlux Backend - Phase 1 & 2

Multi-chain Web3 API Platform Backend - Foundation + WebSocket Support

## Features

### Phase 1 - Foundation
- **Google OAuth Authentication**: Secure authentication using Google ID tokens (NextAuth-compatible)
- **API Key Management**: Generate, manage, and revoke multiple API keys per user
- **Crypto Wallet Payments**: Accept payments via WalletConnect to admin wallet with on-chain verification
- **Usage Analytics**: Track requests, latency, and API usage
- **Rate Limiting**: Redis-backed rate limiting per API key
- **Request Logging**: Comprehensive logging of all API requests

### Phase 2 - WebSocket Support
- **Real-Time WebSocket Streaming**: Production-grade WebSocket server for Nova V2 events
- **Stream Manager**: Client tracking, subscription management, and rate limiting
- **Plan-Based Access**: WebSocket access restricted to Pro and Enterprise plans
- **Auto-Reconnect & Heartbeat**: Built-in ping/pong heartbeats every 30 seconds
- **Real-Time Events**: Price feeds, liquidity shifts, whale movements, volatility spikes, AI predictions, and more

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: Google OAuth 2.0, JWT
- **Validation**: Zod
- **Email**: Nodemailer

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server
- Google OAuth credentials
- SMTP server for emails
- RPC endpoints for supported chains (Ethereum, Polygon, Base, Arbitrum, Optimism)

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/TATEN-art/onyxflux-backend.git
cd onyxflux-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `EMAIL_SERVER`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`: SMTP configuration
- `BACKEND_URL`, `FRONTEND_URL`: Application URLs
- `ADMIN_WALLET_ADDRESS`: Wallet address for receiving payments (0x654b3235f81f77023423c5533281f079ad8286a7)
- `ETH_RPC_URL`, `POLYGON_RPC_URL`, `BASE_RPC_URL`, `ARBITRUM_RPC_URL`, `OPTIMISM_RPC_URL`: RPC endpoints

4. **Generate Prisma client**

```bash
npm run prisma:generate
```

5. **Run database migrations**

```bash
npm run prisma:migrate
```

6. **Start the development server**

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the PORT specified in .env)

## Production Deployment

1. **Build the project**

```bash
npm run build
```

2. **Run database migrations**

```bash
npm run prisma:deploy
```

3. **Start the production server**

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /auth/google/verify` - Verify Google ID token and create session
- `POST /auth/logout` - Logout and destroy session
- `GET /auth/me` - Get current user info

### API Keys

- `POST /api-keys` - Create new API key
- `GET /api-keys` - List all API keys
- `POST /api-keys/revoke` - Revoke an API key
- `DELETE /api-keys/:keyId` - Delete an API key

### Billing

- `POST /billing/confirm` - Confirm crypto payment and upgrade plan
- `GET /billing/payments` - Get payment history

### Analytics

- `GET /analytics` - Get usage analytics and request logs

### WebSocket (Phase 2)

- `GET /ws/nova/v2` - WebSocket endpoint for real-time Nova V2 events (Pro/Enterprise only)
- `GET /ws/stats` - WebSocket statistics (client count, subscription count)

### Health

- `GET /health` - Health check endpoint

## WebSocket Usage

### Connection

Connect to the WebSocket endpoint with authentication:

```bash
# Using wscat (install with: npm install -g wscat)
wscat -c "ws://localhost:3000/ws/nova/v2?token=YOUR_JWT_TOKEN"

# Or for production
wscat -c "wss://api.onyxflux.io/ws/nova/v2?token=YOUR_JWT_TOKEN"
```

Alternatively, include the token in the Authorization header:

```bash
wscat -c "ws://localhost:3000/ws/nova/v2" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Subscription Format

Subscribe to real-time events for specific symbols and chains:

```json
{
  "action": "subscribe",
  "symbol": "ETH",
  "chain": "ethereum"
}
```

Unsubscribe from events:

```json
{
  "action": "unsubscribe",
  "symbol": "ETH",
  "chain": "ethereum"
}
```

### Real-Time Event Types

The WebSocket streams the following event types:

1. **Price Feed Updates** (`price_update`)
   - Real-time price changes
   - 24h volume and price change percentage

2. **Liquidity Shifts** (`liquidity_shift`)
   - Liquidity pool changes
   - Direction (increase/decrease) and severity

3. **Whale Movements** (`whale_movement`)
   - Large wallet transactions
   - Buy/sell direction and impact level

4. **Volatility Spikes** (`volatility_spike`)
   - Sudden price volatility
   - Volatility index and severity

5. **Trend Direction** (`trend_direction`)
   - Market trend analysis
   - Bullish/bearish/neutral with strength

6. **Risk Score Updates** (`risk_score`)
   - Comprehensive risk assessment
   - Volatility, liquidity, manipulation, sentiment factors

7. **AI Predictions** (`ai_prediction`)
   - Nova AI price predictions
   - Confidence level and target price

8. **Market Sentiment** (`market_sentiment`)
   - Aggregated market sentiment
   - Sentiment score from multiple sources

9. **Breakout Alerts** (`breakout_alert`)
   - AI-detected breakout patterns
   - Resistance/support level breaks

### Plan Limits

| Plan       | Max Connections | Max Subscriptions | Messages/Minute |
|------------|----------------|-------------------|-----------------|
| Free       | 0              | 0                 | 0               |
| Pro        | 3              | 10                | 100             |
| Enterprise | 10             | 50                | 1000            |

### Example Session

```bash
# Connect
wscat -c "ws://localhost:3000/ws/nova/v2?token=YOUR_JWT_TOKEN"

# You'll receive a welcome message
< {"type":"success","data":{"message":"Connected to OnyxFlux Nova V2 WebSocket. Plan: pro. Send subscription messages to start receiving events."},"timestamp":"2025-11-27T12:00:00.000Z"}

# Subscribe to Ethereum
> {"action":"subscribe","symbol":"ETH","chain":"ethereum"}

# Confirmation
< {"type":"success","data":{"message":"Successfully subscribed to ethereum:ETH"},"timestamp":"2025-11-27T12:00:01.000Z"}

# Receive real-time events
< {"type":"event","data":{"type":"price_update","symbol":"ETH","chain":"ethereum","price":3500.50,"change24h":2.5,"volume24h":1500000000,"timestamp":"2025-11-27T12:00:02.000Z"},"timestamp":"2025-11-27T12:00:02.000Z"}

# Heartbeat (every 30 seconds)
< {"type":"heartbeat","timestamp":"2025-11-27T12:00:30.000Z"}
```

## Folder Structure

```
src/
├── auth/              # Authentication logic
├── users/             # User management and analytics
├── billing/           # Payment verification and plan management
├── apiKeys/           # API key management
├── ws/                # WebSocket infrastructure (Phase 2)
│   ├── types.ts       # WebSocket event type definitions
│   ├── streamManager.ts # Client and subscription management
│   └── ws.routes.ts   # WebSocket routes
├── config/            # Environment configuration
│   ├── env.ts         # Environment variable loader
│   └── database.ts    # Prisma client instance
├── utils/             # Utility functions (logger, crypto, email, error handling)
├── middlewares/       # Authentication and API key middlewares
├── nova/              # (Phase 3+) Nova Intelligence Engine
├── bots/              # (Phase 3+) Bot Builder
├── tokenGenerator/    # (Phase 3+) Token Generator
├── backtesting/       # (Phase 3+) Backtesting Engine
├── strategies/        # (Phase 3+) Strategy Hub
└── server.ts          # Main server file

prisma/
└── schema.prisma      # Database schema
```

## Next Steps

Phases 1 & 2 provide the foundation and real-time streaming. Future phases will add:

- **Phase 3**: Nova Intelligence Engine (AI predictions, whale detection, liquidity analysis)
- **Phase 4**: Bot Builder (automated trading strategies)
- **Phase 5**: Token Generator (ERC-20, ERC-721 creation)
- **Phase 6**: Backtesting Engine (strategy simulation)
- **Phase 7**: Strategy Hub (community strategies)
- **Phase 8**: Pricing tier enforcement (enhanced limits)
- **Phase 9**: Security hardening (encryption, audit logs)
- **Phase 10**: Nova chat endpoint (AI assistant)

## Support

For support, email support@onyxflux.io

## License

Proprietary - All rights reserved
