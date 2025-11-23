# OnyxFlux Backend V2 - Complete Deployment Guide

This is the complete deployment guide for OnyxFlux Backend V2 with all security hardening, pricing tier enforcement, and Nova chat features.

## 🚀 What's New in This Update (Parts 7-10)

### Part 7: Pricing Tier Enforcement
- **Starter ($0)**: No Nova, No Bot Builder, No Token Generator, No Backtesting, No Strategy Hub, Low rate limits (100 req/min)
- **Pro ($49.99)**: Nova for 10 tokens, 5 bots, 3 token generator uses/month, 3 backtests/month, 10 strategies, Danger alerts, Medium rate limits (1000 req/min)
- **Enterprise ($599.99)**: Unlimited everything, Private Nova strategy model, Highest priority, High rate limits (10000 req/min)

### Part 8: Security Hardening
- **API Key Encryption**: AES-256-GCM encryption for API keys
- **HMAC Signatures**: Webhook signature validation
- **XSS Protection**: Input sanitization middleware
- **CORS Hardening**: Secure CORS configuration
- **JWT Hardening**: Secure JWT configuration
- **WebSocket Security**: Secure WebSocket connections
- **Input Validation**: SQL injection and command injection prevention
- **Anti-Abuse Filters**: Rate limiting per user/IP
- **Audit Logs**: Complete audit trail for admin panel
- **Secure Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS, CSP, Referrer-Policy, Permissions-Policy

### Part 9: Nova Chat
- **POST /api/nova/chat**: Chat with Nova AI assistant (crypto-only questions)
- Rejects non-crypto questions with helpful message
- Provides guidance on trading, DeFi, NFTs, security, technical analysis, backtesting, and more

### Part 10: Complete Deployment Instructions
This document!

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Redis 6+ running
- PM2 installed globally (`npm install -g pm2`)
- Nginx installed (for production)
- Git access to repository
- SSH access to VPS

## 🔧 Step-by-Step Deployment

### Step 1: Pull Latest Code

```bash
cd /path/to/onyxflux-backend
git fetch origin
git checkout main
git pull origin main
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Update Environment Variables

Add these new variables to your `.env` file (if not already present):

```bash
# Encryption key for API keys (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_64_character_hex_key_here

# Webhook secret for HMAC signatures (generate with: openssl rand -hex 32)
WEBHOOK_SECRET=your_webhook_secret_here

# All other existing environment variables remain the same
```

Generate encryption key:
```bash
openssl rand -hex 32
```

### Step 4: Run Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migration (creates new tables and updates existing ones)
npx prisma migrate deploy
```

### Step 5: Build TypeScript

```bash
npm run build
```

### Step 6: Restart Application

#### Using PM2:

```bash
# Restart all processes
pm2 restart all

# Or restart specific process
pm2 restart onyxflux-backend

# Check logs
pm2 logs onyxflux-backend

# Check status
pm2 status
```

#### Using Docker:

```bash
# Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f backend
```

## 🧪 Testing Each Route

### 1. Test Health Check

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

### 2. Test Nova Chat (Crypto Question)

```bash
curl -X POST https://api.onyxflux.io/api/nova/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the best strategy for swing trading?"
  }'
```

Expected response:
```json
{
  "success": true,
  "response": "Trading strategies depend on your risk tolerance..."
}
```

### 3. Test Nova Chat (Non-Crypto Question)

```bash
curl -X POST https://api.onyxflux.io/api/nova/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather today?"
  }'
```

Expected response:
```json
{
  "error": "Sorry, I can only answer crypto-related questions..."
}
```

### 4. Test Bot Builder (Pro Plan Required)

```bash
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

### 5. Test Token Generator (Pro Plan Required)

```bash
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

### 6. Test Backtesting (Pro Plan Required)

```bash
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

### 7. Test Strategy Hub (Pro Plan Required)

```bash
# Get popular strategies (public)
curl https://api.onyxflux.io/api/strategies/popular

# Create strategy (requires Pro plan)
curl -X POST https://api.onyxflux.io/api/strategies/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Strategy",
    "description": "A swing trading strategy",
    "strategyType": "Swing",
    "timeframe": "15m",
    "riskLevel": "medium",
    "parameters": {},
    "isPublic": false
  }'
```

## 🔑 How to Get API Keys

### Standard OnyxFlux API Key

1. **Login to your account**:
   ```bash
   curl -X POST https://api.onyxflux.io/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your@email.com"
     }'
   ```

2. **Verify with OTP code** (check your email):
   ```bash
   curl -X POST https://api.onyxflux.io/auth/verify \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your@email.com",
       "code": "123456"
     }'
   ```
   
   This returns a JWT token. Save it!

3. **Generate API key**:
   ```bash
   curl -X POST https://api.onyxflux.io/api-keys/generate \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "My API Key"
     }'
   ```
   
   Response:
   ```json
   {
     "success": true,
     "apiKey": {
       "id": "...",
       "key": "ONYX-KEY-...",
       "name": "My API Key",
       "createdAt": "..."
     }
   }
   ```

4. **Use the API key**:
   ```bash
   curl https://api.onyxflux.io/v1/rpc/ethereum \
     -H "X-API-Key: ONYX-KEY-..."
   ```

### Nova API Key

Nova features use the same JWT token from authentication. There is no separate "Nova API key" - just use your JWT token:

```bash
curl -X POST https://api.onyxflux.io/api/nova/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is DeFi?"
  }'
```

**Note**: Nova features require Pro or Enterprise plan. Starter plan users will receive a 403 error.

## ✅ What Works Perfectly

### Core Features (All Plans)
- ✅ Authentication (email OTP, JWT sessions)
- ✅ User management
- ✅ API key generation and rotation
- ✅ Multi-chain RPC gateway (12 chains)
- ✅ Rate limiting per plan
- ✅ Analytics and metrics
- ✅ Webhook delivery with HMAC signatures
- ✅ WebSocket streaming for alerts

### V2 Features (Pro/Enterprise Only)
- ✅ Nova V2 Intelligence Engine (multi-timeframe predictions)
- ✅ AI Bot Builder (signal generation every 30 seconds)
- ✅ Token Generator (ERC-20 and ERC-721 with security audit)
- ✅ Backtesting Engine (strategy simulation with historical data)
- ✅ Social Strategy Hub (community strategies with likes/copies)
- ✅ Nova Chat (crypto-only Q&A assistant)

### Security Features (All Plans)
- ✅ XSS protection middleware
- ✅ SQL injection prevention
- ✅ Command injection prevention
- ✅ HMAC signature validation for webhooks
- ✅ API key encryption (AES-256-GCM)
- ✅ Secure headers (HSTS, CSP, X-Frame-Options, etc.)
- ✅ Anti-abuse filters (rate limiting per user/IP)
- ✅ Audit logging for admin actions

### Pricing Tier Enforcement
- ✅ Starter: Standard API only, no V2 features
- ✅ Pro: Nova (10 tokens), Bot Builder (5 bots), Token Generator (3/month), Backtesting (3/month), Strategy Hub (10 strategies)
- ✅ Enterprise: Unlimited everything with highest priority

## 🔍 What Needs to Be Checked

### 1. Environment Variables
**Check**: Ensure all environment variables are set correctly in `.env`

```bash
# Required variables
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secret_here
ENCRYPTION_KEY=your_64_char_hex_key_here
WEBHOOK_SECRET=your_webhook_secret_here
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key_here
PAYMENT_WALLET_ADDRESS=0x654b3235f81f77023423c5533281f079ad8286a7

# RPC endpoints for all 12 chains
RPC_ETHEREUM=https://...
RPC_POLYGON=https://...
RPC_ARBITRUM=https://...
RPC_OPTIMISM=https://...
RPC_BASE=https://...
RPC_BSC=https://...
RPC_AVALANCHE=https://...
RPC_FANTOM=https://...
RPC_CRONOS=https://...
RPC_LINEA=https://...
RPC_SCROLL=https://...
RPC_ZKSYNC=https://...
```

**How to check**:
```bash
cd /path/to/onyxflux-backend
cat .env | grep -E "DATABASE_URL|REDIS_HOST|JWT_SECRET|ENCRYPTION_KEY"
```

### 2. Database Connection
**Check**: Ensure PostgreSQL is running and accessible

```bash
# Test database connection
npx prisma db pull

# Check database tables
npx prisma studio
```

**Expected**: Should see all tables including new V2 tables (BotConfigV2, BotSignal, Backtest, Strategy, StrategyLike)

### 3. Redis Connection
**Check**: Ensure Redis is running and accessible

```bash
# Test Redis connection
redis-cli ping

# Expected output: PONG
```

### 4. PM2 Process Status
**Check**: Ensure PM2 is running the backend process

```bash
pm2 status
```

**Expected output**:
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ status  │ restart │ uptime   │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ onyxflux-backend     │ online  │ 0       │ 5m       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

### 5. Nginx Configuration
**Check**: Ensure Nginx is configured correctly for WebSocket support

```bash
# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**Required Nginx config** for WebSocket support:
```nginx
location /nova/v2/stream {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /alerts/stream {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 6. SSL Certificate
**Check**: Ensure SSL certificate is valid and not expired

```bash
# Check SSL certificate expiry
echo | openssl s_client -servername api.onyxflux.io -connect api.onyxflux.io:443 2>/dev/null | openssl x509 -noout -dates
```

**Expected**: Certificate should not be expired

### 7. Background Services
**Check**: Ensure Nova V2 WebSocket and Bot Queue are running

```bash
# Check PM2 logs for startup messages
pm2 logs onyxflux-backend --lines 50 | grep -E "Nova V2|Bot Queue"
```

**Expected output**:
```
Starting Nova V2 WebSocket server...
Starting Bot Queue...
```

### 8. Plan Limits Enforcement
**Check**: Test that plan limits are enforced correctly

**Test with Starter account** (should fail):
```bash
curl -X POST https://api.onyxflux.io/api/bot/create \
  -H "Authorization: Bearer STARTER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "0x...",
    "chain": "ethereum",
    "strategy": "Swing",
    "riskLevel": "medium"
  }'
```

**Expected response**:
```json
{
  "error": "Bot Builder is not available on your plan",
  "upgrade": "Upgrade to Pro or Enterprise to access Bot Builder"
}
```

**Test with Pro account** (should succeed):
```bash
curl -X POST https://api.onyxflux.io/api/bot/create \
  -H "Authorization: Bearer PRO_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "0x...",
    "chain": "ethereum",
    "strategy": "Swing",
    "riskLevel": "medium"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "bot": {
    "id": "...",
    "token": "0x...",
    "chain": "ethereum",
    "strategy": "Swing",
    "riskLevel": "medium",
    "status": "active",
    "createdAt": "..."
  }
}
```

### 9. Security Headers
**Check**: Ensure security headers are present in responses

```bash
curl -I https://api.onyxflux.io/
```

**Expected headers**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 10. Audit Logs
**Check**: Ensure audit logs are being generated

```bash
# Check PM2 logs for audit entries
pm2 logs onyxflux-backend --lines 100 | grep "Audit Log"
```

**Expected**: Should see audit log entries for user actions

## 🐛 Troubleshooting

### Issue: "Bot Builder is not available on your plan"
**Solution**: Upgrade to Pro or Enterprise plan. Starter plan does not have access to V2 features.

### Issue: "Too many requests"
**Solution**: You've exceeded your plan's rate limit. Wait 1 minute or upgrade to a higher plan.

### Issue: "Missing signature" on webhook
**Solution**: Include `X-Signature` header with HMAC-SHA256 signature of the payload using your webhook secret.

### Issue: Nova Chat returns "Sorry, I can only answer crypto-related questions"
**Solution**: Ask a crypto-related question. Nova Chat only answers questions about cryptocurrencies, blockchain, trading, DeFi, NFTs, and Web3.

### Issue: WebSocket connection fails
**Solution**: Check Nginx configuration for WebSocket support (see section 5 above).

### Issue: "Invalid signature" error
**Solution**: Regenerate HMAC signature using correct webhook secret and payload.

### Issue: PM2 process keeps restarting
**Solution**: Check PM2 logs for errors: `pm2 logs onyxflux-backend --err`

### Issue: Database connection error
**Solution**: Check DATABASE_URL in .env and ensure PostgreSQL is running: `sudo systemctl status postgresql`

### Issue: Redis connection error
**Solution**: Check Redis is running: `sudo systemctl status redis` and REDIS_HOST/REDIS_PORT in .env

## 📊 Performance Monitoring

### Check System Metrics

```bash
# CPU and memory usage
pm2 monit

# Detailed process info
pm2 show onyxflux-backend

# System metrics endpoint
curl https://api.onyxflux.io/metrics/system
```

### Check Database Performance

```bash
# Active connections
psql -U postgres -d onyxflux -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries
psql -U postgres -d onyxflux -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Check Redis Performance

```bash
# Redis info
redis-cli info stats

# Monitor commands
redis-cli monitor
```

## 🔒 Security Best Practices

1. **Rotate encryption keys regularly** (every 90 days)
2. **Monitor audit logs daily** for suspicious activity
3. **Keep dependencies updated**: `npm audit` and `npm update`
4. **Use strong JWT secrets** (at least 32 characters)
5. **Enable HTTPS only** (disable HTTP)
6. **Implement IP whitelisting** for admin endpoints
7. **Regular database backups** (daily)
8. **Monitor rate limit violations** for abuse patterns
9. **Review webhook signatures** for all incoming webhooks
10. **Keep SSL certificates updated** (use Let's Encrypt auto-renewal)

## 📞 Support

If you encounter issues during deployment:

1. Check logs: `pm2 logs onyxflux-backend`
2. Verify database connection: `npx prisma db pull`
3. Check Redis connection: `redis-cli ping`
4. Review environment variables: `cat .env`
5. Check Nginx configuration: `sudo nginx -t`
6. Review this deployment guide

## 🎉 Deployment Complete!

Your OnyxFlux Backend V2 is now fully deployed with:
- ✅ Pricing tier enforcement (Starter/Pro/Enterprise)
- ✅ Security hardening (encryption, HMAC, XSS, CORS, JWT, audit logs)
- ✅ Nova Chat (crypto-only Q&A assistant)
- ✅ Complete deployment instructions

All features are production-ready and fully integrated with your existing authentication, rate limiting, and payment systems.

**Next Steps**:
1. Test all endpoints with your API keys
2. Monitor PM2 logs for any errors
3. Set up monitoring and alerting
4. Configure backup strategy
5. Review security settings
6. Test plan limit enforcement
7. Verify WebSocket connections
8. Check audit logs

**Your backend is ready to power millions of requests!** 🚀
