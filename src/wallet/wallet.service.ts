import prisma from '../config/database';
import { Logger } from '../utils/logger';

const logger = new Logger('WalletService');

export class WalletService {
  async connectWallet(userId: string, address: string, chain: string) {
    try {
      const existing = await prisma.userWallet.findFirst({
        where: {
          userId,
          address,
          chain,
        },
      });

      if (existing) {
        return { success: true, address, wallet: existing };
      }

      const wallet = await prisma.userWallet.create({
        data: {
          userId,
          address,
          chain,
        },
      });

      logger.info(`Wallet connected: ${address} on ${chain} for user ${userId}`);

      return { success: true, address, wallet };
    } catch (error) {
      logger.error('Error connecting wallet:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  async listWallets(userId: string) {
    try {
      const wallets = await prisma.userWallet.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return wallets;
    } catch (error) {
      logger.error('Error listing wallets:', error);
      throw new Error('Failed to list wallets');
    }
  }

  async removeWallet(walletId: string, userId: string) {
    try {
      const wallet = await prisma.userWallet.findFirst({
        where: {
          id: walletId,
          userId,
        },
      });

      if (!wallet) {
        throw new Error('Wallet not found or unauthorized');
      }

      await prisma.userWallet.delete({
        where: { id: walletId },
      });

      logger.info(`Wallet removed: ${walletId} for user ${userId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error removing wallet:', error);
      throw error;
    }
  }
}
