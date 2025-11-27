# OnyxFlux Backend - Phase 1 Foundation

Multi-chain Web3 API Platform Backend - Phase 1 Foundation

## Features

- **Google OAuth Authentication**: Secure authentication using Google ID tokens (NextAuth-compatible)
- **API Key Management**: Generate, manage, and revoke multiple API keys per user
- **Crypto Wallet Payments**: Accept payments via WalletConnect to admin wallet with on-chain verification
- **Usage Analytics**: Track requests, latency, and API usage
- **Rate Limiting**: Redis-backed rate limiting per API key
- **Request Logging**: Comprehensive logging of all API requests

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

### Health

- `GET /health` - Health check endpoint

## Folder Structure

```
src/
├── auth/              # Authentication logic
├── users/             # User management and analytics
├── billing/           # Payment verification and plan management
├── apiKeys/           # API key management
├── config/            # Environment configuration
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

Phase 1 provides the foundation. Future phases will add:

- **Phase 2**: WebSocket support, enhanced rate limiting
- **Phase 3**: Nova Intelligence Engine
- **Phase 4**: Bot Builder
- **Phase 5**: Token Generator
- **Phase 6**: Backtesting Engine
- **Phase 7**: Strategy Hub
- **Phase 8**: Pricing tier enforcement
- **Phase 9**: Security hardening
- **Phase 10**: Nova chat endpoint

## Support

For support, email support@onyxflux.io

## License

Proprietary - All rights reserved
