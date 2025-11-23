CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BotConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "strategyType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whaleAlerts" BOOLEAN NOT NULL DEFAULT true,
    "manipulationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "liquidityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "botSignals" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserWallet_userId_idx" ON "UserWallet"("userId");

CREATE INDEX "UserWallet_address_idx" ON "UserWallet"("address");

CREATE UNIQUE INDEX "UserWallet_userId_address_chain_key" ON "UserWallet"("userId", "address", "chain");

CREATE INDEX "BotConfig_userId_idx" ON "BotConfig"("userId");

CREATE INDEX "BotConfig_status_idx" ON "BotConfig"("status");

CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

CREATE INDEX "UserNotificationSettings_userId_idx" ON "UserNotificationSettings"("userId");

ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BotConfig" ADD CONSTRAINT "BotConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
