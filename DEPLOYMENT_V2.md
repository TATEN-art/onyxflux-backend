# OnyxFlux Backend V2 Deployment Guide

This guide covers deploying OnyxFlux Backend V2 with all new features including Nova V2 Intelligence Engine, AI Bot Builder, Token Generator, Backtesting Engine, and Social Strategy Hub.

## 🚀 What's New in V2

### Part 1: Nova V2 Intelligence Engine
- **Multi-timeframe predictions** (1m, 5m, 15m, 1h, 4h, 24h)
- **Advanced models**: Volatility clustering, whale-delta, liquidity shifts, market structure analysis
- **Real-time WebSocket broadcasting** on `/nova/v2/stream`
- **7 alert types**: Whale activity, liquidity drops, volatility spikes, rugpull detection, MEV patterns, gas spikes, admin wallet movements
- **Strategy classification**: Breakout, Scalper, Whale Momentum, Swing, Range Trading, Trend Following
- **Market display aggregation**: RSI, MACD, Bollinger Bands, EMAs, volume profile, liquidity data

### Part 2: AI Bot Builder Engine
- **Bot configuration system**: Create, update, and manage AI monitoring bots
- **Nova-powered signal generation**: Automated signals every 30 seconds
- **Strategy recommendations**: Based on market conditions and user risk preferences
- **Performance tracking**: Win rate, signal history, bot analytics
- **Plan-based limits**: Free (0), Starter (3), Pro (10), Enterprise (50) bots

### Part 3: Token Generator
- **ERC-20 generator**: Create custom tokens with taxes, anti-bot features, liquidity settings
- **ERC-721 generator**: Create NFT collections with royalties, reveal mechanics, mint limits
- **AI-powered audit**: Comprehensive security analysis with rugpull risk, ownership risk, liquidity risk, blacklist detection
- **Bytecode pattern scanning**: Detect hidden mints, selfdestruct, delegatecall, proxy patterns
- **Safety recommendations**: Automated security warnings and best practices

### Part 4: Backtesting Engine
- **Strategy simulation**: Test Nova strategies against historical data
- **Performance metrics**: Win rate, ROI, Sharpe ratio, profit factor, max drawdown
- **Multi-strategy comparison**: Compare different strategies side-by-side
- **Equity curve visualization**: Track capital over time
- **Risk management**: Stop loss, take profit, position sizing
- **Plan-based limits**: Free (0), Starter (5), Pro (50), Enterprise (500) backtests/month

### Part 5: Social Strategy Hub
- **Community strategies**: Share and discover trading strategies
- **Nova-verified strategies**: Curated high-quality strategies
- **Social features**: Like, copy, view count tracking
- **Strategy search**: Filter by type, timeframe, risk level, tags
- **Performance tracking**: Backtest results, win rates, returns
- **Plan-based limits**: Free (0), Starter (5), Pro (50), Enterprise (500) strategies

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Redis 6+ running
- PM2 installed globally (`npm install -g pm2`)
- Nginx installed (for production)
- Git access to repository

## 🔧 Deployment Steps

### 1. Pull Latest Changes

```bash
cd /path/to/onyxflux-backend
git fetch origin
git checkout main
git pull origin main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Update Environment Variables

```bash
# No new environment variables required for V2
# All V2 features use existing configuration
```

### 4. Run Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migration (creates new tables: BotConfigV2, BotSignal, Backtest, Strategy, StrategyLike)
npx prisma migrate deploy
```

### 5. Build TypeScript

```bash
npm run build
```

### 6. Restart Application

#### Using PM2:

```bash
# Restart all processes
pm2 restart all

# Or restart specific process
pm2 restart onyxflux-backend

# Check logs
pm2 logs onyxflux-backend
```

#### Using Docker:

```bash
# Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f backend
```

## 🧪 Verify Deployment

### 1. Check Server Health

```bash
curl https://api.onyxflux.io/
```

Expected response:
```json
{
  "name": "OnyxFlux API",
  "version": "1.0.0",
  "status": "operational",
  "documentation": "/docs"
}
```

### 2. Test Nova V2 WebSocket

```bash
# Connect to Nova V2 WebSocket
wscat -c wss://api.onyxflux.io/nova/v2/stream

# Subscribe to a symbol
{"action":"subscribe","symbol":"ETH","chain":"ethereum"}
```

### 3. Test Bot Builder API

```bash
# Create a bot (requires authentication)
curl -X POST https://api.onyxflux.io/api/bot/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "0x...",
    "chain": "ethereum",
    "strategy": "Swing",
    "riskLevel": "medium"
  }'
```

### 4. Test Token Generator

```bash
# Generate ERC-20 token
curl -X POST https://api.onyxflux.io/api/token/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ERC20",
    "config": {
      "name": "My Token",
      "symbol": "MTK",
      "totalSupply": "1000000",
      "decimals": 18,
      "ownerAddress": "0x..."
    }
  }'
```

### 5. Test Backtesting Engine

```bash
# Run backtest
curl -X POST https://api.onyxflux.io/api/backtest/run \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ETH",
    "chain": "ethereum",
    "strategy": "Swing",
    "timeframe": "15m",
    "startDate": 1700000000000,
    "endDate": 1700086400000,
    "initialCapital": 10000,
    "riskLevel": "medium"
  }'
```

### 6. Test Strategy Hub

```bash
# Get popular strategies
curl https://api.onyxflux.io/api/strategies/popular

# Get top performing strategies
curl https://api.onyxflux.io/api/strategies/top

# Get Nova-verified strategies
curl https://api.onyxflux.io/api/strategies/verified
```

## 📊 New Database Tables

V2 adds 5 new tables to your PostgreSQL database:

1. **BotConfigV2**: Stores AI bot configurations
2. **BotSignal**: Stores signals generated by bots
3. **Backtest**: Stores backtest results
4. **Strategy**: Stores community and Nova-verified strategies
5. **StrategyLike**: Tracks strategy likes

## 🔄 Background Services

V2 introduces new background services that start automatically:

1. **Nova V2 WebSocket Server**: Real-time broadcasting on `/nova/v2/stream`
2. **Bot Queue**: Generates signals every 30 seconds for active bots

These services are managed by the main server process and will start/stop with your application.

## 🎯 API Endpoints Added

### Bot Builder
- `POST /api/bot/create` - Create new bot
- `POST /api/bot/update` - Update bot configuration
- `GET /api/bot/list` - List user's bots
- `GET /api/bot/:id` - Get bot details with signals
- `DELETE /api/bot/:id` - Delete bot

### Token Generator
- `POST /api/token/generate` - Generate ERC-20 or ERC-721 contract
- `POST /api/token/deploy` - Get deployment instructions
- `POST /api/token/audit` - Audit token contract
- `GET /api/token/audit/quick/:chain/:address` - Quick audit
- `GET /api/token/templates` - Get recommended templates

### Backtesting
- `POST /api/backtest/run` - Run backtest simulation
- `GET /api/backtest/list` - List user's backtests
- `GET /api/backtest/:id` - Get backtest details
- `DELETE /api/backtest/:id` - Delete backtest
- `POST /api/backtest/compare` - Compare multiple backtests

### Strategy Hub
- `POST /api/strategies/create` - Create new strategy
- `GET /api/strategies/popular` - Get popular strategies
- `GET /api/strategies/top` - Get top performing strategies
- `GET /api/strategies/verified` - Get Nova-verified strategies
- `GET /api/strategies/my` - Get user's strategies
- `GET /api/strategies/:id` - Get strategy details
- `PUT /api/strategies/:id` - Update strategy
- `DELETE /api/strategies/:id` - Delete strategy
- `POST /api/strategies/:id/like` - Like/unlike strategy
- `POST /api/strategies/:id/copy` - Copy strategy
- `GET /api/strategies/search` - Search strategies

## 🔒 Plan Limits

V2 features respect existing plan limits:

| Feature | FREE | STARTER | PRO | ENTERPRISE |
|---------|------|---------|-----|------------|
| Bots | 0 | 3 | 10 | 50 |
| Backtests/month | 0 | 5 | 50 | 500 |
| Strategies | 0 | 5 | 50 | 500 |

## 🐛 Troubleshooting

### Bot Queue Not Starting

Check logs for errors:
```bash
pm2 logs onyxflux-backend | grep "BotQueue"
```

Ensure database connection is working:
```bash
npx prisma db pull
```

### WebSocket Connection Failing

Check Nginx configuration includes WebSocket support:
```nginx
location /nova/v2/stream {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Migration Fails

If migration fails, check PostgreSQL logs:
```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

Manually apply migration:
```bash
npx prisma migrate resolve --applied add_v2_models
```

## 📈 Performance Considerations

### Bot Queue Performance

- Bot queue runs every 30 seconds
- Each active bot generates 1 signal per cycle
- For 100 active bots: ~3.3 signals/second
- Recommended: Monitor CPU usage and scale horizontally if needed

### WebSocket Connections

- Each WebSocket connection maintains state
- Recommended: Use Redis for WebSocket state in multi-instance deployments
- Current implementation: In-memory (single instance only)

### Backtesting Performance

- Backtests are CPU-intensive
- Large date ranges (>30 days) may take 10-30 seconds
- Recommended: Implement queue system for long-running backtests
- Current implementation: Synchronous (may timeout on large datasets)

## 🔐 Security Notes

### Token Generator

- Contracts are generated but NOT deployed by the backend
- Users deploy from their own wallets
- Backend never handles private keys
- Audit results are informational only - not financial advice

### Bot Builder

- Bots do NOT execute trades automatically
- Bots only generate signals
- Users must manually execute trades
- Backend never accesses user wallets

## 📞 Support

If you encounter issues during deployment:

1. Check logs: `pm2 logs onyxflux-backend`
2. Verify database connection: `npx prisma db pull`
3. Check Redis connection: `redis-cli ping`
4. Review environment variables: `cat .env`

## 🎉 Deployment Complete!

Your OnyxFlux Backend V2 is now deployed with:
- ✅ Nova V2 Intelligence Engine
- ✅ AI Bot Builder Engine
- ✅ Token Generator
- ✅ Backtesting Engine
- ✅ Social Strategy Hub

All features are production-ready and fully integrated with your existing authentication, rate limiting, and payment systems.
