import prisma from '../../config/database';
import { Logger } from '../../utils/logger';
import { ChainsService } from '../../chains/chains.service';

const logger = new Logger('ManipulationService');

interface ManipulationDetection {
  type: 'spoofing' | 'wash' | 'pumpdump' | 'rug';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  walletCluster?: string;
  details: string;
}

export class ManipulationService {
  private chainsService: ChainsService;
  private scanInterval: NodeJS.Timeout | null = null;
  private monitoredTokens: Map<string, Set<string>> = new Map();
  private transactionHistory: Map<string, Array<{
    timestamp: number;
    from: string;
    to: string;
    amount: number;
    price: number;
  }>> = new Map();

  constructor(chainsService: ChainsService) {
    this.chainsService = chainsService;
  }

  startScanning(): void {
    if (this.scanInterval) {
      logger.warn('Manipulation scanning already running');
      return;
    }

    logger.info('Starting manipulation detection (30-second cycles)');
    
    this.scanInterval = setInterval(async () => {
      await this.scanForManipulation();
    }, 30000);

    this.scanForManipulation();
  }

  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      logger.info('Manipulation scanning stopped');
    }
  }

  addTokenToMonitor(chain: string, tokenAddress: string): void {
    if (!this.monitoredTokens.has(chain)) {
      this.monitoredTokens.set(chain, new Set());
    }
    this.monitoredTokens.get(chain)!.add(tokenAddress.toLowerCase());
    logger.info(`Added ${tokenAddress} on ${chain} to manipulation monitoring`);
  }

  private async scanForManipulation(): Promise<void> {
    try {
      const chains = this.chainsService.getSupportedChains();
      
      for (const chain of chains) {
        const tokens = this.monitoredTokens.get(chain);
        if (!tokens || tokens.size === 0) continue;

        for (const tokenAddress of tokens) {
          await this.scanTokenForManipulation(chain, tokenAddress);
        }
      }
    } catch (error) {
      logger.error('Manipulation scanning error:', error);
    }
  }

  private async scanTokenForManipulation(chain: string, tokenAddress: string): Promise<void> {
    try {
      const transactions = await this.getRecentTransactions(chain, tokenAddress);
      
      const spoofing = this.detectSpoofing(transactions);
      if (spoofing) {
        await this.recordManipulation(chain, tokenAddress, spoofing);
      }

      const washTrading = this.detectWashTrading(transactions);
      if (washTrading) {
        await this.recordManipulation(chain, tokenAddress, washTrading);
      }

      const pumpDump = this.detectPumpAndDump(transactions);
      if (pumpDump) {
        await this.recordManipulation(chain, tokenAddress, pumpDump);
      }

      const rug = this.detectRugPull(transactions);
      if (rug) {
        await this.recordManipulation(chain, tokenAddress, rug);
      }
    } catch (error) {
      logger.error(`Manipulation scan error for ${tokenAddress} on ${chain}:`, error);
    }
  }

  private async getRecentTransactions(chain: string, tokenAddress: string): Promise<Array<{
    timestamp: number;
    from: string;
    to: string;
    amount: number;
    price: number;
  }>> {
    const key = `${chain}:${tokenAddress}`;
    return this.transactionHistory.get(key) || [];
  }

  private detectSpoofing(transactions: Array<{
    timestamp: number;
    from: string;
    to: string;
    amount: number;
    price: number;
  }>): ManipulationDetection | null {
    const recentTxs = transactions.slice(-50);
    
    const largeCancelledOrders = recentTxs.filter(tx => {
      return tx.amount > 10000 && tx.to === tx.from;
    });

    if (largeCancelledOrders.length > 5) {
      return {
        type: 'spoofing',
        severity: 'high',
        confidence: 0.75,
        details: `Detected ${largeCancelledOrders.length} large orders that were quickly cancelled, indicating potential spoofing`,
      };
    }

    return null;
  }

  private detectWashTrading(transactions: Array<{
    timestamp: number;
    from: string;
    to: string;
    amount: number;
    price: number;
  }>): ManipulationDetection | null {
    const recentTxs = transactions.slice(-100);
    const walletPairs = new Map<string, number>();

    for (const tx of recentTxs) {
      const pair = [tx.from, tx.to].sort().join(':');
      walletPairs.set(pair, (walletPairs.get(pair) || 0) + 1);
    }

    for (const [pair, count] of walletPairs.entries()) {
      if (count > 10) {
        return {
          type: 'wash',
          severity: 'high',
          confidence: 0.8,
          walletCluster: pair,
          details: `Detected ${count} transactions between the same wallet pair, indicating wash trading`,
        };
      }
    }

    return null;
  }

  private detectPumpAndDump(transactions: Array<{
    timestamp: number;
    from: string;
    to: string;
    amount: number;
    price: number;
  }>): ManipulationDetection | null {
    if (transactions.length < 20) return null;

    const recentTxs = transactions.slice(-20);
    const prices = recentTxs.map(tx => tx.price);
    
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceIncrease = (maxPrice - minPrice) / minPrice;

    const maxPriceIndex = prices.indexOf(maxPrice);
    const pricesAfterPeak = prices.slice(maxPriceIndex);
    
    if (priceIncrease > 0.5 && pricesAfterPeak.length > 3) {
      const avgAfterPeak = pricesAfterPeak.reduce((a, b) => a + b, 0) / pricesAfterPeak.length;
      const dropFromPeak = (maxPrice - avgAfterPeak) / maxPrice;

      if (dropFromPeak > 0.3) {
        return {
          type: 'pumpdump',
          severity: 'high',
          confidence: 0.7,
          details: `Price increased ${(priceIncrease * 100).toFixed(1)}% then dropped ${(dropFromPeak * 100).toFixed(1)}%, indicating pump and dump`,
        };
      }
    }

    return null;
  }

  private detectRugPull(transactions: Array<{
    timestamp: number;
    from: string;
    to: string;
    amount: number;
    price: number;
  }>): ManipulationDetection | null {
    const recentTxs = transactions.slice(-10);
    
    const massiveSells = recentTxs.filter(tx => {
      return tx.amount > 50000;
    });

    const uniqueSellers = new Set(massiveSells.map(tx => tx.from));

    if (massiveSells.length > 3 && uniqueSellers.size < 3) {
      return {
        type: 'rug',
        severity: 'high',
        confidence: 0.85,
        walletCluster: Array.from(uniqueSellers).join(','),
        details: `Detected ${massiveSells.length} massive sell orders from ${uniqueSellers.size} wallets, indicating potential rug pull`,
      };
    }

    return null;
  }

  private async recordManipulation(
    chain: string,
    tokenAddress: string,
    detection: ManipulationDetection
  ): Promise<void> {
    await prisma.manipulationEvent.create({
      data: {
        chain,
        tokenAddress,
        type: detection.type,
        severity: detection.severity,
        confidence: detection.confidence,
        walletCluster: detection.walletCluster,
        metadata: { details: detection.details },
      },
    });

    logger.warn(`${detection.type.toUpperCase()} detected on ${chain} for ${tokenAddress} (${detection.severity} severity, ${(detection.confidence * 100).toFixed(0)}% confidence)`);
  }

  async getRecentManipulationEvents(limit: number = 50) {
    return prisma.manipulationEvent.findMany({
      take: limit,
      orderBy: { detectedAt: 'desc' },
    });
  }

  async getManipulationEventsByToken(chain: string, tokenAddress: string, limit: number = 50) {
    return prisma.manipulationEvent.findMany({
      where: { chain, tokenAddress },
      take: limit,
      orderBy: { detectedAt: 'desc' },
    });
  }
}
