# OnyxFlux Backend Extension - Deployment Instructions

This document provides instructions for deploying the new backend features to your VPS.

## Overview of New Features

The following features have been added to the OnyxFlux backend:

1. **Wallet Connection Endpoints** - Connect and manage user wallets (WalletConnect integration)
2. **Nova Live Market Feed** - Real-time market data, candles, predictions, and reasoning
3. **Bot System** - AI monitoring bot configuration and management
4. **Notification System** - Alert preferences and notification management
5. **API Key Testing** - Endpoints to test standard and Nova API keys
6. **Dashboard Data** - Aggregated dashboard data endpoint

## New Database Models

Three new Prisma models have been added:

- `UserWallet` - Stores connected wallet addresses for users
- `BotConfig` - Stores bot configuration and settings
- `UserNotificationSettings` - Stores user notification preferences

## Deployment Steps

### 1. Pull Latest Changes

```bash
cd /path/to/onyxflux-backend
git pull origin main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Database Migration

This will create the new tables in your PostgreSQL database:

```bash
npx prisma migrate deploy
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Restart the Application

If using PM2:

```bash
pm2 restart all
```

Or if using a specific app name:

```bash
pm2 restart onyxflux-backend
```

If using Docker:

```bash
docker-compose down
docker-compose up -d --build
```

### 6. Verify Deployment

Check that the server is running:

```bash
pm2 status
# or
pm2 logs onyxflux-backend
```

Test the new endpoints:

```bash
# Test health check
curl https://api.onyxflux.io/

# Test wallet endpoints (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.onyxflux.io/wallet/list

# Test Nova live prices (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.onyxflux.io/nova/live/prices

# Test dashboard (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.onyxflux.io/user/dashboard
```

## New API Endpoints

### Wallet Connection

- `POST /wallet/connect` - Connect a new wallet
- `GET /wallet/list` - List all connected wallets
- `DELETE /wallet/remove/:id` - Remove a wallet

### Nova Live Market Feed

- `GET /nova/live/prices` - Get live token prices with changes
- `GET /nova/live/candles/:symbol` - Get OHLC candle data
- `GET /nova/live/predictions/:symbol` - Get Nova predictions
- `GET /nova/live/reasoning/:symbol` - Get Nova reasoning feed

### Bot System

- `GET /bots/list` - List all user bots
- `POST /bots/create` - Create a new bot configuration
- `GET /bots/get/:id` - Get a specific bot
- `DELETE /bots/delete/:id` - Delete a bot

### Notifications

- `GET /notifications/list` - List all notifications
- `POST /notifications/test` - Send a test notification
- `POST /notifications/settings` - Save notification preferences
- `GET /notifications/settings` - Get notification preferences

### API Key Testing

- `GET /v1/test/standard-key` - Test standard API key
- `GET /v1/test/nova-key` - Test Nova API key

### Dashboard

- `GET /user/dashboard` - Get aggregated dashboard data

## Rollback Instructions

If you need to rollback the changes:

```bash
# Revert to previous commit
git log --oneline  # Find the commit hash before the extension
git reset --hard <previous-commit-hash>

# Rollback database migration
npx prisma migrate resolve --rolled-back 20250123010337_add_wallet_bot_notification_models

# Restart application
pm2 restart all
```

## Notes

- All new endpoints require authentication (JWT token)
- Mock data is returned for live market feeds and predictions
- No existing logic, authentication, or Nova engine code was modified
- All changes are additive only (new files, new routes, new controllers)

## Support

If you encounter any issues during deployment, check:

1. PM2 logs: `pm2 logs onyxflux-backend`
2. Database connection: Ensure PostgreSQL is running
3. Environment variables: Verify `.env` file is properly configured
4. Prisma client: Run `npx prisma generate` if you see Prisma-related errors

## Files Added

### Services
- `src/wallet/wallet.service.ts`
- `src/nova/live/live.service.ts`
- `src/bots/bots.service.ts`
- `src/notifications/notifications.service.ts`
- `src/dashboard/dashboard.service.ts`

### Routes
- `src/wallet/wallet.routes.ts`
- `src/nova/live/live.routes.ts`
- `src/bots/bots.routes.ts`
- `src/notifications/notifications.routes.ts`
- `src/test/test.routes.ts`
- `src/dashboard/dashboard.routes.ts`

### Database
- `prisma/migrations/20250123010337_add_wallet_bot_notification_models/migration.sql`

### Modified Files
- `prisma/schema.prisma` - Added 3 new models
- `src/server.ts` - Registered new routes

---

**Deployment Date**: 2025-01-23  
**Version**: 1.1.0  
**Status**: Production Ready
