import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import env from '../config/env';
import { AppError } from '../utils/errorHandler';
import { sendPlanUpgradeEmail } from '../utils/email';

const prisma = new PrismaClient();

const RPC_URLS: Record<string, string> = {
  ethereum: env.ETH_RPC_URL,
  polygon: env.POLYGON_RPC_URL,
  base: env.BASE_RPC_URL,
  arbitrum: env.ARBITRUM_RPC_URL,
  optimism: env.OPTIMISM_RPC_URL,
};

const PLAN_PRICES: Record<string, { amount: string; duration: number }> = {
  pro: { amount: '49.99', duration: 30 },
  enterprise: { amount: '599.99', duration: 30 },
};

export async function verifyTransaction(chain: string, txHash: string) {
  const rpcUrl = RPC_URLS[chain.toLowerCase()];

  if (!rpcUrl) {
    throw new AppError(400, 'Unsupported chain');
  }

  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [txHash],
      id: 1,
    });

    const receipt = response.data.result;

    if (!receipt) {
      throw new AppError(400, 'Transaction not found');
    }

    if (receipt.status !== '0x1') {
      throw new AppError(400, 'Transaction failed');
    }

    const toAddress = receipt.to?.toLowerCase();
    const adminAddress = env.ADMIN_WALLET_ADDRESS.toLowerCase();

    if (toAddress !== adminAddress) {
      const logs = receipt.logs || [];
      let isTransferToAdmin = false;

      for (const log of logs) {
        if (log.topics && log.topics.length >= 3) {
          const transferTo = '0x' + log.topics[2].slice(-40);
          if (transferTo.toLowerCase() === adminAddress) {
            isTransferToAdmin = true;
            break;
          }
        }
      }

      if (!isTransferToAdmin) {
        throw new AppError(400, 'Payment not sent to admin wallet');
      }
    }

    return {
      verified: true,
      from: receipt.from,
      to: receipt.to,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(400, 'Failed to verify transaction');
  }
}

export async function confirmPayment(
  userId: string,
  chain: string,
  txHash: string,
  plan: string,
  token: string = 'USDC'
) {
  const existingPayment = await prisma.payment.findUnique({
    where: { txHash },
  });

  if (existingPayment) {
    throw new AppError(400, 'Transaction already processed');
  }

  const verification = await verifyTransaction(chain, txHash);

  const planConfig = PLAN_PRICES[plan.toLowerCase()];

  if (!planConfig) {
    throw new AppError(400, 'Invalid plan');
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      chain,
      txHash,
      amount: planConfig.amount,
      token,
      plan,
      status: 'verified',
      verifiedAt: new Date(),
    },
  });

  const planExpiry = new Date();
  planExpiry.setDate(planExpiry.getDate() + planConfig.duration);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      planExpiry,
    },
  });

  await sendPlanUpgradeEmail(user.email, user.name || 'User', plan);

  return {
    payment,
    user: {
      id: user.id,
      plan: user.plan,
      planExpiry: user.planExpiry,
    },
  };
}

export async function getPaymentHistory(userId: string) {
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return payments;
}
