# OnyxFlux API Documentation

Complete API reference for the OnyxFlux backend platform.

## Base URL

```
Production: https://api.onyxflux.io
Development: http://localhost:3000
```

## Authentication

Most endpoints require authentication via JWT token or API key.

### JWT Authentication
Include in request headers:
```
Authorization: Bearer {your-jwt-token}
```

### API Key Authentication
Include in request headers:
```
X-API-Key: ONYX-KEY-{your-api-key}
```

---

## Authentication Endpoints

### Send Verification Code

Send a 6-digit verification code to user's email.

**Endpoint:** `POST /auth/send-code`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Verification code sent"
}
```

**Errors:**
- `400 Bad Request` - Invalid email format
- `500 Internal Server Error` - Failed to send email

---

### Verify Code

Verify the 6-digit code and receive JWT token.

**Endpoint:** `POST /auth/verify-code`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400 Bad Request` - Missing email or code
- `401 Unauthorized` - Invalid or expired code

---

### Get Current User

Get authenticated user's information.

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "PRO",
    "trialStart": "2025-01-01T00:00:00.000Z",
    "trialEnd": "2025-01-06T00:00:00.000Z",
    "novaCreditsLeft": 2500,
    "apiRequestCount": 12345,
    "novaRequestCount": 45,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## User Endpoints

### Get User Stats

Get detailed user statistics.

**Endpoint:** `GET /users/stats`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "stats": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "PRO",
    "trialStart": "2025-01-01T00:00:00.000Z",
    "trialEnd": "2025-01-06T00:00:00.000Z",
    "novaCreditsLeft": 2500,
    "apiRequestCount": 12345,
    "novaRequestCount": 45,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "planLimits": {
      "apiRequests": 10000000,
      "novaCredits": 2500,
      "rateLimit": 5000
    },
    "isTrialExpired": false
  }
}
```

---

## API Key Endpoints

### Generate API Key

Create a new API key.

**Endpoint:** `POST /api-keys`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Production API Key"
}
```

**Response:** `200 OK`
```json
{
  "message": "API key generated successfully",
  "key": "ONYX-KEY-a1b2c3d4e5f6...",
  "prefix": "ONYX-KEY-a1b2c3d4e5f6"
}
```

**Note:** Save the full key securely. It will not be shown again.

---

### List API Keys

Get all API keys for the authenticated user.

**Endpoint:** `GET /api-keys`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "keys": [
    {
      "id": "uuid",
      "keyPrefix": "ONYX-KEY-a1b2c3d4e5f6",
      "name": "Production API Key",
      "lastUsedAt": "2025-01-15T10:30:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Revoke API Key

Revoke an API key.

**Endpoint:** `DELETE /api-keys/{keyId}`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "API key revoked successfully"
}
```

---

### Rotate API Key

Rotate an API key (revoke old, generate new).

**Endpoint:** `POST /api-keys/{keyId}/rotate`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "API key rotated successfully",
  "key": "ONYX-KEY-new-key...",
  "prefix": "ONYX-KEY-new-key"
}
```

---

### Get API Key Usage

Get usage statistics for an API key.

**Endpoint:** `GET /api-keys/{keyId}/usage`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "stats": {
    "keyId": "uuid",
    "keyPrefix": "ONYX-KEY-a1b2c3d4e5f6",
    "lastUsedAt": "2025-01-15T10:30:00.000Z",
    "usageToday": 1234
  }
}
```

---

## Payment Endpoints

### Get Payment Info

Get payment wallet address and accepted tokens.

**Endpoint:** `GET /payments/info`

**Response:** `200 OK`
```json
{
  "walletAddress": "0x...",
  "acceptedTokens": ["USDT", "USDC"],
  "acceptedChains": ["ethereum", "polygon", "arbitrum", "optimism", "base"],
  "plans": {
    "starter": { "price": 99, "currency": "USD" },
    "pro": { "price": 499, "currency": "USD" },
    "enterprise": { "price": 1999, "currency": "USD" }
  }
}
```

---

### Get Payment History

Get user's payment history.

**Endpoint:** `GET /payments/history`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "payments": [
    {
      "id": "uuid",
      "txHash": "0x...",
      "chain": "ethereum",
      "token": "USDC",
      "amount": "499",
      "plan": "PRO",
      "status": "CONFIRMED",
      "confirmedAt": "2025-01-15T10:30:00.000Z",
      "createdAt": "2025-01-15T10:25:00.000Z"
    }
  ]
}
```

---

### Confirm Payment

Manually confirm a payment transaction.

**Endpoint:** `POST /payments/confirm`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "txHash": "0x..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Payment confirmed successfully"
}
```

---

## Multi-Chain RPC Endpoints

### Get Supported Chains

Get list of supported blockchain networks.

**Endpoint:** `GET /v1/chains`

**Response:** `200 OK`
```json
{
  "chains": [
    "ethereum",
    "polygon",
    "arbitrum",
    "optimism",
    "base",
    "bsc",
    "avalanche",
    "fantom",
    "cronos",
    "linea",
    "scroll",
    "zksync"
  ]
}
```

---

### Get Chain Status

Get status of all supported chains.

**Endpoint:** `GET /v1/chains/status`

**Response:** `200 OK`
```json
{
  "status": {
    "ethereum": {
      "available": true,
      "latency": 45,
      "blockNumber": 18500000
    },
    "polygon": {
      "available": true,
      "latency": 32,
      "blockNumber": 50000000
    }
  }
}
```

---

### Execute RPC Call (GET)

Execute an RPC call via GET request.

**Endpoint:** `GET /v1/rpc/{chain}`

**Headers:**
```
X-API-Key: ONYX-KEY-...
```

**Query Parameters:**
- `method` (required): RPC method name
- `params` (optional): JSON-encoded array of parameters

**Example:**
```
GET /v1/rpc/ethereum?method=eth_blockNumber
```

**Response:** `200 OK`
```json
{
  "result": "0x11a4d0c"
}
```

---

### Execute RPC Call (POST)

Execute an RPC call via POST request.

**Endpoint:** `POST /v1/rpc/{chain}`

**Headers:**
```
X-API-Key: ONYX-KEY-...
Content-Type: application/json
```

**Request Body:**
```json
{
  "method": "eth_getBlockByNumber",
  "params": ["latest", false]
}
```

**Response:** `200 OK`
```json
{
  "result": {
    "number": "0x11a4d0c",
    "hash": "0x...",
    "timestamp": "0x..."
  }
}
```

---

## Nova Intelligence Endpoints

### Price Prediction

Get AI-powered price prediction for a token.

**Endpoint:** `POST /nova/predict`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "tokenAddress": "0x...",
  "chain": "ethereum",
  "historicalData": [
    {
      "timestamp": 1705320000,
      "price": 2500.50,
      "volume": 1000000
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "prediction": {
    "predicted_price": 2525.75,
    "prediction_1h": 2525.75,
    "prediction_4h": 2550.20,
    "prediction_24h": 2600.00,
    "confidence": 0.78,
    "reasoning": "Based on multi-model analysis (ARIMA, Holt-Winters, Volatility Clustering), the price is predicted to increase by 1.01% in the next hour. Strong upward trend detected. Low volatility indicates stable price action. Elevated trading volume supports the prediction. Confidence: 78%."
  }
}
```

**Cost:** 3 Nova credits

---

### Get Recent Whale Activity

Get recent whale transactions across all monitored tokens.

**Endpoint:** `GET /nova/whales/recent`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:** `200 OK`
```json
{
  "whales": [
    {
      "id": "uuid",
      "chain": "ethereum",
      "tokenAddress": "0x...",
      "walletAddress": "0x...",
      "classification": "mega",
      "amount": "1500000.0",
      "amountUsd": 1500000,
      "type": "buy",
      "txHash": "0x...",
      "metadata": {},
      "detectedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Cost:** 10 Nova credits

---

### Get Whale Activity by Token

Get whale activity for a specific token.

**Endpoint:** `GET /nova/whales/{chain}/{token}`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:** Same as recent whale activity

**Cost:** 10 Nova credits

---

### Get Liquidity Data

Get current liquidity data for a token.

**Endpoint:** `GET /nova/liquidity/{chain}/{token}`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "liquidity": {
    "id": "uuid",
    "chain": "ethereum",
    "tokenAddress": "0x...",
    "poolAddress": "0x...",
    "liquidityUsd": 5000000,
    "volume24h": 1000000,
    "healthScore": 0.85,
    "metadata": {},
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

**Cost:** 5 Nova credits

---

### Get Recent Manipulation Events

Get recent manipulation detection events.

**Endpoint:** `GET /nova/manipulation/recent`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:** `200 OK`
```json
{
  "events": [
    {
      "id": "uuid",
      "chain": "ethereum",
      "tokenAddress": "0x...",
      "type": "spoofing",
      "severity": "high",
      "confidence": 0.75,
      "walletCluster": "0x...,0x...",
      "metadata": {
        "details": "Detected 8 large orders that were quickly cancelled, indicating potential spoofing"
      },
      "detectedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Cost:** 20 Nova credits

---

### Add Token to Whale Monitoring

Add a token to whale detection monitoring.

**Endpoint:** `POST /nova/monitor/whale`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "chain": "ethereum",
  "tokenAddress": "0x..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Token added to whale monitoring"
}
```

---

### Add Pool to Liquidity Monitoring

Add a pool to liquidity monitoring.

**Endpoint:** `POST /nova/monitor/liquidity`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "chain": "ethereum",
  "poolAddress": "0x..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Pool added to liquidity monitoring"
}
```

---

### Add Token to Manipulation Monitoring

Add a token to manipulation detection monitoring.

**Endpoint:** `POST /nova/monitor/manipulation`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "chain": "ethereum",
  "tokenAddress": "0x..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Token added to manipulation monitoring"
}
```

---

## Alert Endpoints

### Get Alerts

Get user's alerts.

**Endpoint:** `GET /alerts`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:** `200 OK`
```json
{
  "alerts": [
    {
      "id": "uuid",
      "type": "WHALE_BUY",
      "title": "Mega Whale Buy Detected",
      "message": "A mega whale purchased $1.5M worth of tokens",
      "severity": "high",
      "metadata": {},
      "read": false,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Get Unread Alert Count

Get count of unread alerts.

**Endpoint:** `GET /alerts/unread-count`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "count": 5
}
```

---

### Mark Alert as Read

Mark a specific alert as read.

**Endpoint:** `POST /alerts/{alertId}/read`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "Alert marked as read"
}
```

---

### Mark All Alerts as Read

Mark all alerts as read.

**Endpoint:** `POST /alerts/read-all`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "All alerts marked as read"
}
```

---

### WebSocket Alert Stream

Connect to real-time alert stream.

**Endpoint:** `WS /alerts/stream`

**Protocol:** WebSocket

**Example (JavaScript):**
```javascript
const ws = new WebSocket('wss://api.onyxflux.io/alerts/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Alert received:', data);
};
```

---

## Webhook Endpoints

### Create Webhook

Register a webhook URL for event notifications.

**Endpoint:** `POST /webhooks`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhook",
  "events": [
    "WHALE_BUY",
    "WHALE_SELL",
    "MANIPULATION_SPOOFING"
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Webhook created successfully",
  "webhook": {
    "id": "uuid",
    "secret": "webhook-secret-for-signature-verification"
  }
}
```

**Note:** Save the secret for verifying webhook signatures.

---

### List Webhooks

Get all registered webhooks.

**Endpoint:** `GET /webhooks`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "webhooks": [
    {
      "id": "uuid",
      "url": "https://your-domain.com/webhook",
      "events": ["WHALE_BUY", "WHALE_SELL"],
      "active": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Delete Webhook

Delete a webhook.

**Endpoint:** `DELETE /webhooks/{webhookId}`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "Webhook deleted successfully"
}
```

---

### Toggle Webhook

Activate or deactivate a webhook.

**Endpoint:** `PATCH /webhooks/{webhookId}`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "active": false
}
```

**Response:** `200 OK`
```json
{
  "message": "Webhook updated successfully"
}
```

---

### Get Webhook Deliveries

Get delivery history for a webhook.

**Endpoint:** `GET /webhooks/{webhookId}/deliveries`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:** `200 OK`
```json
{
  "deliveries": [
    {
      "id": "uuid",
      "payload": {
        "event": "WHALE_BUY",
        "data": {}
      },
      "status": 200,
      "response": "OK",
      "attemptCount": 1,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Webhook Payload Format

When an event occurs, OnyxFlux sends a POST request to your webhook URL:

**Headers:**
```
Content-Type: application/json
X-OnyxFlux-Signature: hmac-sha256-signature
X-OnyxFlux-Event: WHALE_BUY
X-OnyxFlux-Timestamp: 1705320000000
```

**Body:**
```json
{
  "event": "WHALE_BUY",
  "timestamp": 1705320000000,
  "data": {
    "chain": "ethereum",
    "tokenAddress": "0x...",
    "walletAddress": "0x...",
    "classification": "mega",
    "amount": "1500000.0",
    "amountUsd": 1500000,
    "txHash": "0x..."
  }
}
```

**Signature Verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}
```

---

## Analytics Endpoints

### Get System Metrics

Get system-wide metrics (public endpoint).

**Endpoint:** `GET /metrics/system`

**Response:** `200 OK`
```json
{
  "metrics": {
    "requests24h": 1234567,
    "averageLatency": 45.5,
    "successRate": 0.998,
    "activeUsers": 1234,
    "novaUsage": 5678,
    "whaleEvents": 89,
    "manipulationAlerts": 12,
    "chainStatus": {
      "ethereum": {
        "available": true,
        "latency": 45,
        "blockNumber": 18500000
      }
    },
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Get User Metrics

Get authenticated user's metrics.

**Endpoint:** `GET /metrics/user`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "metrics": {
    "plan": "PRO",
    "totalApiRequests": 12345,
    "totalNovaRequests": 45,
    "novaCreditsLeft": 2455,
    "requestsToday": 234,
    "memberSince": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Get Usage Stats

Get detailed usage statistics.

**Endpoint:** `GET /metrics/usage`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "stats": {
    "last7Days": [
      { "date": "2025-01-09", "requests": 1234 },
      { "date": "2025-01-10", "requests": 1456 },
      { "date": "2025-01-11", "requests": 1678 },
      { "date": "2025-01-12", "requests": 1890 },
      { "date": "2025-01-13", "requests": 2012 },
      { "date": "2025-01-14", "requests": 2234 },
      { "date": "2025-01-15", "requests": 234 }
    ]
  }
}
```

---

### Get System Status

Get API status (public endpoint).

**Endpoint:** `GET /status`

**Response:** `200 OK`
```json
{
  "status": "operational",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Rate Limiting

Rate limits are enforced per plan:

| Plan | Requests per Minute |
|------|---------------------|
| Free | 100 |
| Starter | 1,000 |
| Pro | 5,000 |
| Enterprise | 50,000 |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
```

**Rate Limit Exceeded Response:** `429 Too Many Requests`
```json
{
  "error": "Rate limit exceeded",
  "limit": 5000,
  "reset": 45
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `402 Payment Required` - Insufficient credits
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Nova Credit Costs

| Operation | Credits |
|-----------|---------|
| Text Answer | 1 |
| Price Prediction | 3 |
| Liquidity Analysis | 5 |
| Whale Scan | 10 |
| Manipulation Scan | 20 |

---

## Support

For API support or questions:
- Email: support@onyxflux.io
- Documentation: https://docs.onyxflux.io
