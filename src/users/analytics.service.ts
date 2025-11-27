import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getUserAnalytics(userId: string) {
  const totalRequests = await prisma.requestLog.count({
    where: { userId },
  });

  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);

  const requestsLast24h = await prisma.requestLog.count({
    where: {
      userId,
      createdAt: { gte: last24Hours },
    },
  });

  const avgLatency = await prisma.requestLog.aggregate({
    where: { userId },
    _avg: { latency: true },
  });

  const recentLogs = await prisma.requestLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      method: true,
      path: true,
      statusCode: true,
      latency: true,
      createdAt: true,
    },
  });

  return {
    totalRequests,
    requestsLast24h,
    avgLatency: avgLatency._avg.latency || 0,
    recentLogs,
  };
}

export async function logRequest(data: {
  userId?: string;
  apiKeyId?: string;
  method: string;
  path: string;
  statusCode: number;
  latency: number;
  ip?: string;
  userAgent?: string;
}) {
  await prisma.requestLog.create({
    data,
  });
}
