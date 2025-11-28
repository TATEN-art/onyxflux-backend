# OnyxFlux Backend - Phases 1-5

Multi-chain Web3 API Platform Backend - Foundation + WebSocket + Nova Intelligence + Bot Builder + Token Generator

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

### Phase 3 - Nova Intelligence Engine
- **Real-Time Market Ingestion**: Token price feeds, liquidity monitoring, whale detection, volatility tracking, mempool watching
- **Event Processor**: Transforms raw data into 9 event types with normalization and signal combination
- **Trend Classification**: Bullish/bearish/neutral trend detection with strength scoring
- **Risk Score Engine**: 0-100 risk scoring based on volatility, liquidity, whale activity, and sentiment
- **AI Prediction Layer**: Deterministic prediction logic with confidence scores and reasoning (LLM-ready structure)
- **Nova API**: GET /nova/insights endpoint for comprehensive market analysis

### Phase 4 - Bot Builder Engine
- **Bot Configuration**: Support for Ethereum, Base, BNB Chain, Solana with 7 trading strategies
- **AI Logic Integration**: Direct Nova V2 integration for trend, liquidity, whale, volatility, and sentiment signals
- **7 Trading Strategies**: Trend-Following, Breakout, Scalping, Momentum, Reversal, Whale Tracking, Sideways Accumulation
- **Runtime Engine**: Cron-based evaluation (30s-2min intervals) with multi-bot support per user
- **WebSocket Streaming**: Real-time bot signals with confidence scores and reasoning
- **Full CRUD API**: Create, list, view, update, and delete bots with audit logging

### Phase 5 - Token Generator Engine
- **Multi-Chain Support**: Generate tokens on Ethereum, Base, BNB Chain, and Solana
- **EVM Smart Contracts**: Full ERC-20/BEP-20 contract generation with OpenZeppelin standards
- **Solana SPL Tokens**: Anchor-based SPL token generation with metadata support
- **Advanced Features**: Mintable, burnable, anti-whale, anti-bot, liquidity tax, marketing tax
- **Logo Processing**: Automatic 512x512 PNG conversion with circle cropping
- **Contract Compilation**: Bytecode, ABI, and deployment data generation
- **Explorer Verification**: Instructions for Etherscan, BaseScan, BscScan, Solscan verification
- **Plan-Based Limits**: Pro (2 tokens), Enterprise (10 tokens), with rate limiting

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

### Nova Intelligence (Phase 3)

- `GET /nova/insights?token=0x...&chain=ethereum|base` - Get comprehensive market insights for a token
- `GET /nova/health` - Nova service health check

### Bot Builder (Phase 4)

- `POST /bot/create` - Create a new trading bot
- `GET /bot/list` - List all user's bots
- `GET /bot/:id` - Get bot details with latest signals
- `PATCH /bot/:id` - Update bot configuration
- `DELETE /bot/:id` - Delete a bot
- `GET /bot/:id/signals` - Get bot signal history
- `POST /bot/:id/evaluate` - Trigger immediate bot evaluation
- `GET /bot/runtime/status` - Get bot runtime engine status

### Token Generator (Phase 5)

- `POST /token/create` - Create a new token (ERC-20, BEP-20, or SPL)
- `GET /token/list` - List all user-created tokens
- `GET /token/:id` - Get token details with deployment data
- `POST /token/:id/deploy` - Update token with deployment transaction hash
- `POST /token/:id/verify` - Trigger explorer verification
- `GET /token/health` - Token generator health check

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

## Bot Builder Usage

### Creating a Bot

Create a trading bot with your preferred strategy and risk level:

```bash
curl -X POST http://localhost:3000/bot/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ETH Trend Follower",
    "chain": "ethereum",
    "tokenAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "strategy": "trend_following",
    "riskLevel": "medium",
    "enableNotifications": true
  }'
```

### Available Strategies

1. **Trend Following** (`trend_following`)
   - Follows established market trends with momentum confirmation
   - Best for: Strong trending markets
   - Signal conditions: Bullish trend (>60% strength) + positive prediction

2. **Breakout** (`breakout`)
   - Detects and trades breakout patterns with volume confirmation
   - Best for: Volatile markets with clear support/resistance
   - Signal conditions: Volatility spike + increasing liquidity + bullish trend

3. **Scalping** (`scalping`)
   - Quick trades on small price movements with tight stops
   - Best for: Moderate volatility, low risk environments
   - Signal conditions: Volatility 30-60 + low risk (<50) + strong prediction

4. **Momentum** (`momentum`)
   - Trades strong momentum moves with whale activity confirmation
   - Best for: High momentum markets with whale participation
   - Signal conditions: Strong trend (>70%) + whale accumulation + bullish sentiment

5. **Reversal** (`reversal`)
   - Identifies trend reversals using volatility and sentiment signals
   - Best for: Overextended markets showing reversal signs
   - Signal conditions: Bearish trend + whale accumulation + bullish prediction (or vice versa)

6. **Whale Tracking** (`whale_tracking`)
   - Follows whale movements and accumulation patterns
   - Best for: Markets with significant whale activity
   - Signal conditions: Whale accumulation/distribution + acceptable risk

7. **Sideways Accumulation** (`sideways_accumulation`)
   - Accumulates during low volatility sideways markets
   - Best for: Range-bound markets before breakouts
   - Signal conditions: Neutral trend + low volatility (<40) + increasing liquidity

### Risk Levels

| Risk Level | Capital Allocation | Stop Loss | Take Profit | Min Confidence | Evaluation Interval |
|------------|-------------------|-----------|-------------|----------------|---------------------|
| Low        | 2%                | 2%        | 5%          | 75%            | 120s                |
| Medium     | 3.5%              | 3%        | 8%          | 65%            | 60s                 |
| High       | 5%                | 5%        | 12%         | 55%            | 30s                 |

### Bot Signal Structure

Each bot evaluation generates a signal with the following data:

```json
{
  "id": "signal_id",
  "botId": "bot_id",
  "signalType": "buy",
  "confidence": 85.5,
  "entryPrice": 3500.50,
  "exitPrice": null,
  "stopLoss": 3395.49,
  "takeProfit": 3780.54,
  "capitalAllocation": 3.5,
  "reasoning": "Trend Following: Strong bullish trend (75%) with bullish prediction (90% confidence).",
  "novaData": {
    "trend": "bullish",
    "trendStrength": 75,
    "riskScore": 35,
    "volatilityIndex": 45,
    "liquidityDirection": "increasing",
    "whaleActivity": "accumulating",
    "marketSentiment": "bullish",
    "prediction": "bullish",
    "predictionConfidence": 90,
    "targetPrice": 3800.00
  },
  "createdAt": "2025-11-28T01:00:00.000Z"
}
```

### Listing Your Bots

```bash
curl -X GET http://localhost:3000/bot/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Getting Bot Details

```bash
curl -X GET http://localhost:3000/bot/:botId \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Updating a Bot

```bash
curl -X PATCH http://localhost:3000/bot/:botId \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "momentum",
    "riskLevel": "high",
    "isActive": true
  }'
```

### Deleting a Bot

```bash
curl -X DELETE http://localhost:3000/bot/:botId \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Bot WebSocket Streaming

Subscribe to real-time bot signals via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/nova/v2?token=YOUR_JWT_TOKEN');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'bot_signal') {
    console.log('New bot signal:', message.data);
    // Handle bot signal (buy/sell/hold)
  }
});

// Subscribe to specific bot updates
ws.send(JSON.stringify({
  action: 'subscribe',
  botId: 'your_bot_id'
}));
```

### Bot Best Practices

1. **Start with Low Risk**: Begin with low risk level to understand bot behavior
2. **Monitor Signals**: Review bot signals regularly to ensure they align with your strategy
3. **Diversify Strategies**: Use multiple bots with different strategies for diversification
4. **Adjust Based on Market**: Switch strategies based on market conditions (trending vs sideways)
5. **Set Realistic Expectations**: Bots provide signals, not guaranteed profits
6. **Review Audit Logs**: Check bot audit logs for evaluation history and errors
7. **Test with Small Positions**: Start with small capital allocations before scaling up

### Bot Runtime Engine

The bot runtime engine automatically evaluates all active bots at their configured intervals:
- Low risk bots: Every 120 seconds
- Medium risk bots: Every 60 seconds
- High risk bots: Every 30 seconds

Check runtime status:

```bash
curl -X GET http://localhost:3000/bot/runtime/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Nova Integration

Each bot integrates directly with the Nova V2 Intelligence Engine to receive:
- **Trend Direction**: Bullish/bearish/neutral with strength percentage
- **Risk Score**: 0-100 comprehensive risk assessment
- **Volatility Index**: Real-time volatility measurement
- **Liquidity Direction**: Pool liquidity changes (increasing/decreasing/stable)
- **Whale Activity**: Accumulation/distribution/neutral
- **Market Sentiment**: Aggregated sentiment from price, volume, and whale data
- **AI Prediction**: Predicted direction with confidence and target price
- **Reasoning**: Human-readable explanation for each signal

This integration ensures bots make informed decisions based on real-time market intelligence.

## Token Generator Usage

### Overview

The Token Generator allows Pro and Enterprise users to create custom tokens on multiple blockchains with advanced features like anti-whale protection, anti-bot mechanisms, and tax systems.

### Supported Blockchains

1. **Ethereum** - ERC-20 tokens
2. **Base** - ERC-20 tokens
3. **BNB Smart Chain** - BEP-20 tokens
4. **Solana** - SPL tokens

### Creating a Token

```bash
curl -X POST http://localhost:3000/token/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockchain": "ethereum",
    "name": "My Token",
    "symbol": "MTK",
    "totalSupply": 1000000,
    "decimals": 18,
    "features": {
      "mintable": true,
      "burnable": true,
      "liquidityTax": 2,
      "marketingTax": 3,
      "antiWhale": true,
      "antiBot": true
    },
    "uploadLogo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
    "verifyOnExplorer": true,
    "destinationWallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

### Token Features

#### Mintable
- Allows the owner to mint additional tokens after deployment
- Useful for tokens with dynamic supply needs
- Can be disabled after deployment if needed

#### Burnable
- Allows token holders to burn (destroy) their tokens
- Reduces total supply permanently
- Useful for deflationary tokenomics

#### Anti-Whale Protection
- **Max Wallet Amount**: Limits maximum tokens per wallet (default 2% of supply)
- **Max Transaction Amount**: Limits maximum tokens per transaction (default 1% of supply)
- Prevents large holders from manipulating the market

#### Anti-Bot Protection
- **Transfer Cooldown**: Enforces time delay between transfers (default 30 seconds)
- **Blacklist System**: Owner can blacklist suspicious addresses
- **Trading Enable/Disable**: Owner controls when trading starts
- Protects against bot sniping and sandwich attacks

#### Tax System
- **Liquidity Tax**: Percentage of each transaction sent to liquidity wallet
- **Marketing Tax**: Percentage of each transaction sent to marketing wallet
- Taxes only apply to DEX trades (buying/selling)
- Owner can adjust tax rates and wallet addresses

### Response Structure

The API returns comprehensive deployment information:

```json
{
  "tokenId": "clx1234567890",
  "contractSource": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\n...",
  "deploymentData": {
    "bytecode": "0x608060405234801561001057600080fd5b50...",
    "abi": [...],
    "constructorArgs": [],
    "recommendedGas": "3000000"
  },
  "deploymentInstructions": "# Ethereum Token Deployment Instructions\n\n...",
  "explorerVerificationInstructions": "# Etherscan Verification Instructions\n\n..."
}
```

### Deployment Process

#### For EVM Chains (Ethereum, Base, BNB)

1. **Receive Contract Source**
   - Copy the generated Solidity contract source code
   - Save it for deployment and verification

2. **Open Remix IDE**
   - Visit https://remix.ethereum.org
   - Create a new file with your token name (e.g., `MyToken.sol`)
   - Paste the contract source code

3. **Compile Contract**
   - Select Solidity compiler version 0.8.20+
   - Click "Compile"
   - Ensure no errors

4. **Deploy Contract**
   - Select "Injected Provider - MetaMask" as environment
   - Connect your wallet to the correct network
   - Set gas limit to the recommended amount
   - Click "Deploy"
   - Confirm transaction in MetaMask

5. **Save Contract Address**
   - Copy the deployed contract address
   - Update deployment status via API

6. **Verify on Explorer** (Optional)
   - Follow the verification instructions provided
   - Submit contract source to Etherscan/BaseScan/BscScan

#### For Solana

1. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Configure Solana CLI**
   ```bash
   solana config set --url mainnet-beta
   solana config set --keypair ~/.config/solana/id.json
   ```

3. **Create Token Mint**
   ```bash
   spl-token create-token --decimals 9
   ```

4. **Create Token Account**
   ```bash
   spl-token create-account <MINT_ADDRESS>
   ```

5. **Mint Initial Supply**
   ```bash
   spl-token mint <MINT_ADDRESS> 1000000
   ```

6. **Upload Metadata**
   - Use Metaplex to upload token metadata
   - Include name, symbol, and logo

7. **Disable Minting** (if not mintable)
   ```bash
   spl-token authorize <MINT_ADDRESS> mint --disable
   ```

### Updating Deployment Status

After deploying your token, update the backend with transaction details:

```bash
curl -X POST http://localhost:3000/token/:tokenId/deploy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "txHash": "0x1234567890abcdef...",
    "contractAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

### Verifying on Explorer

Trigger verification process:

```bash
curl -X POST http://localhost:3000/token/:tokenId/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Follow the verification instructions provided in the token creation response.

### Listing Your Tokens

```bash
curl -X GET http://localhost:3000/token/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Getting Token Details

```bash
curl -X GET http://localhost:3000/token/:tokenId \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Plan Limits

| Plan       | Tokens Allowed | Rate Limit          |
|------------|----------------|---------------------|
| Free       | 0              | N/A                 |
| Pro        | 2              | 1 per 30 seconds    |
| Enterprise | 10             | 1 per 30 seconds    |

### Logo Requirements

- **Format**: PNG, JPG, or GIF
- **Size**: Maximum 5MB
- **Processing**: Automatically resized to 512x512 pixels
- **Shape**: Center-cropped into a circle
- **Encoding**: Base64 string in request body

### Best Practices

1. **Test on Testnet First**: Deploy on testnet (Goerli, Base Goerli, BSC Testnet, Solana Devnet) before mainnet
2. **Verify Contract**: Always verify your contract on the block explorer for transparency
3. **Secure Private Keys**: Never share your wallet private keys or seed phrases
4. **Review Contract**: Carefully review the generated contract source before deployment
5. **Set Reasonable Taxes**: Keep liquidity and marketing taxes under 10% total to avoid deterring traders
6. **Configure Anti-Whale**: Adjust max wallet and transaction amounts based on your tokenomics
7. **Enable Trading Carefully**: For anti-bot protection, enable trading only when you're ready
8. **Save Deployment Data**: Keep a backup of your contract source, ABI, and deployment transaction

### Security Features

All generated contracts include:
- **OpenZeppelin Standards**: Industry-standard, audited contract libraries
- **Ownership Controls**: Only owner can access privileged functions
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Integer Overflow Protection**: Solidity 0.8+ built-in overflow checks
- **Access Control**: Granular permissions for minting, burning, and configuration

### Common Use Cases

1. **Utility Token**: Mintable + burnable, no taxes, no anti-whale
2. **Meme Coin**: Anti-bot + anti-whale, moderate taxes (2-5%)
3. **Governance Token**: Mintable, no taxes, no anti-whale
4. **Deflationary Token**: Burnable, liquidity tax, anti-whale
5. **Fair Launch Token**: Anti-bot, anti-whale, no minting after launch

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
├── nova/              # Nova Intelligence Engine (Phase 3)
│   ├── ingestion/     # Market data ingestion (price, liquidity, whale, volatility, mempool)
│   ├── engine/        # Core logic (event processor, risk scoring, trend classification, prediction)
│   ├── types/         # Nova type definitions
│   └── nova.routes.ts # Nova API routes
├── bots/              # Bot Builder Engine (Phase 4)
│   ├── types.ts       # Bot type definitions and strategy configs
│   ├── bot.engine.ts  # Bot AI logic with Nova V2 integration
│   ├── bot.service.ts # Bot CRUD operations
│   ├── bot.runtime.ts # Bot runtime engine with cron evaluation
│   ├── bot.routes.ts  # Bot REST API routes
│   └── bot.websocket.ts # Bot WebSocket streaming
├── tokenGenerator/    # Token Generator Engine (Phase 5)
│   ├── types.ts       # Token type definitions and chain configs
│   ├── evmContractGenerator.ts # EVM smart contract generation (Solidity)
│   ├── solanaTokenGenerator.ts # Solana SPL token generation (Anchor)
│   ├── logoProcessor.ts # Logo processing (512x512 PNG, circle crop)
│   ├── token.service.ts # Token CRUD operations and compilation
│   └── token.routes.ts # Token REST API routes
├── config/            # Environment configuration
│   ├── env.ts         # Environment variable loader
│   └── database.ts    # Prisma client instance
├── utils/             # Utility functions (logger, crypto, email, error handling)
├── middlewares/       # Authentication and API key middlewares
├── backtesting/       # (Phase 6+) Backtesting Engine
├── strategies/        # (Phase 7+) Strategy Hub
└── server.ts          # Main server file

prisma/
└── schema.prisma      # Database schema
```

## Completed Phases

- ✅ **Phase 1**: Foundation (Google OAuth, API Keys, Crypto Payments, Analytics)
- ✅ **Phase 2**: WebSocket Support (Real-time streaming, Stream Manager, Plan-based access)
- ✅ **Phase 3**: Nova Intelligence Engine (Market ingestion, Event processor, Risk scoring, AI predictions)
- ✅ **Phase 4**: Bot Builder Engine (7 strategies, Nova integration, Runtime engine, WebSocket streaming)
- ✅ **Phase 5**: Token Generator Engine (ERC-20/BEP-20/SPL tokens, Smart contract generation, Logo processing, Explorer verification)

## Next Steps

Future phases will add:

- **Phase 6**: Backtesting Engine (Strategy simulation with historical data)
- **Phase 7**: Strategy Hub (Community strategies and Nova-verified strategies)
- **Phase 8**: Pricing tier enforcement (Enhanced plan limits)
- **Phase 9**: Security hardening (Encryption, HMAC, audit logs)
- **Phase 10**: Nova chat endpoint (AI assistant for crypto Q&A)

## Support

For support, email support@onyxflux.io

## License

Proprietary - All rights reserved
