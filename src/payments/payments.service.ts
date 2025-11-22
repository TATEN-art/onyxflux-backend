import { ethers } from 'ethers';
import prisma from '../config/database';
import { config } from '../config/env';
import { Logger } from '../utils/logger';
import { UsersService } from '../users/users.service';

const logger = new Logger('PaymentsService');
const usersService = new UsersService();

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export class PaymentsService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const chains = {
      ethereum: config.rpc.ethereum,
      polygon: config.rpc.polygon,
      arbitrum: config.rpc.arbitrum,
      optimism: config.rpc.optimism,
      base: config.rpc.base,
    };

    for (const [chain, rpcUrl] of Object.entries(chains)) {
      if (rpcUrl) {
        this.providers.set(chain, new ethers.JsonRpcProvider(rpcUrl));
      }
    }
  }

  async startPaymentMonitoring(): Promise<void> {
    logger.info('Starting payment monitoring...');

    for (const [chain, provider] of this.providers.entries()) {
      this.monitorChain(chain, provider);
    }
  }

  private async monitorChain(chain: string, provider: ethers.JsonRpcProvider): Promise<void> {
    const contracts = this.getContractsForChain(chain);

    for (const { token, address } of contracts) {
      if (!address) continue;

      try {
        const contract = new ethers.Contract(address, ERC20_ABI, provider);
        const filter = contract.filters.Transfer(null, config.payment.walletAddress);

        contract.on(filter, async (from, to, value, event) => {
          await this.handlePayment(chain, token, event.log.transactionHash, value.toString());
        });

        logger.info(`Monitoring ${token} on ${chain}`);
      } catch (error) {
        logger.error(`Failed to monitor ${token} on ${chain}:`, error);
      }
    }
  }

  private getContractsForChain(chain: string): Array<{ token: string; address: string }> {
    const contracts = [];

    if (config.payment.contracts.usdt[chain as keyof typeof config.payment.contracts.usdt]) {
      contracts.push({
        token: 'USDT',
        address: config.payment.contracts.usdt[chain as keyof typeof config.payment.contracts.usdt],
      });
    }

    if (config.payment.contracts.usdc[chain as keyof typeof config.payment.contracts.usdc]) {
      contracts.push({
        token: 'USDC',
        address: config.payment.contracts.usdc[chain as keyof typeof config.payment.contracts.usdc],
      });
    }

    return contracts;
  }

  private async handlePayment(
    chain: string,
    token: string,
    txHash: string,
    amount: string
  ): Promise<void> {
    try {
      const existing = await prisma.payment.findUnique({
        where: { txHash },
      });

      if (existing) {
        logger.info(`Payment already processed: ${txHash}`);
        return;
      }

      const amountInUsd = this.convertToUsd(amount, token);
      const plan = this.determinePlan(amountInUsd);

      if (!plan) {
        logger.warn(`Payment amount ${amountInUsd} USD does not match any plan`);
        return;
      }

      logger.info(`Payment detected: ${amountInUsd} USD for ${plan} plan`);
    } catch (error) {
      logger.error('Payment handling error:', error);
    }
  }

  private convertToUsd(amount: string, token: string): number {
    const decimals = token === 'USDT' || token === 'USDC' ? 6 : 18;
    return parseFloat(ethers.formatUnits(amount, decimals));
  }

  private determinePlan(amountUsd: number): 'STARTER' | 'PRO' | 'ENTERPRISE' | null {
    if (Math.abs(amountUsd - config.pricing.starter) < 5) return 'STARTER';
    if (Math.abs(amountUsd - config.pricing.pro) < 5) return 'PRO';
    if (Math.abs(amountUsd - config.pricing.enterprise) < 5) return 'ENTERPRISE';
    return null;
  }

  async confirmPayment(txHash: string, userId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { txHash },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'CONFIRMED') {
      throw new Error('Payment already confirmed');
    }

    await prisma.payment.update({
      where: { txHash },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    await usersService.upgradePlan(userId, payment.plan as 'STARTER' | 'PRO' | 'ENTERPRISE');

    logger.info(`Payment confirmed: ${txHash} for user ${userId}`);
  }

  async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
