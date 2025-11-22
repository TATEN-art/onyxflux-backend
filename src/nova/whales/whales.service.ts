import { ethers } from 'ethers';
import prisma from '../../config/database';
import { Logger } from '../../utils/logger';
import { ChainsService } from '../../chains/chains.service';

const logger = new Logger('WhalesService');

interface WhaleClassification {
  type: 'small' | 'medium' | 'mega' | 'institutional';
  threshold: number;
}

const WHALE_THRESHOLDS: WhaleClassification[] = [
  { type: 'institutional', threshold: 5000000 },
  { type: 'mega', threshold: 1000000 },
  { type: 'medium', threshold: 500000 },
  { type: 'small', threshold: 250000 },
];

export class WhalesService {
  private chainsService: ChainsService;
  private scanInterval: NodeJS.Timeout | null = null;
  private monitoredTokens: Map<string, Set<string>> = new Map();

  constructor(chainsService: ChainsService) {
    this.chainsService = chainsService;
  }

  startScanning(): void {
    if (this.scanInterval) {
      logger.warn('Whale scanning already running');
      return;
    }

    logger.info('Starting whale detection scanner (30-second cycles)');
    
    this.scanInterval = setInterval(async () => {
      await this.scanForWhales();
    }, 30000);

    this.scanForWhales();
  }

  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      logger.info('Whale scanning stopped');
    }
  }

  addTokenToMonitor(chain: string, tokenAddress: string): void {
    if (!this.monitoredTokens.has(chain)) {
      this.monitoredTokens.set(chain, new Set());
    }
    this.monitoredTokens.get(chain)!.add(tokenAddress.toLowerCase());
    logger.info(`Added ${tokenAddress} on ${chain} to whale monitoring`);
  }

  private async scanForWhales(): Promise<void> {
    try {
      const chains = this.chainsService.getSupportedChains();
      
      for (const chain of chains) {
        const tokens = this.monitoredTokens.get(chain);
        if (!tokens || tokens.size === 0) continue;

        for (const tokenAddress of tokens) {
          await this.scanTokenForWhales(chain, tokenAddress);
        }
      }
    } catch (error) {
      logger.error('Whale scanning error:', error);
    }
  }

  private async scanTokenForWhales(chain: string, tokenAddress: string): Promise<void> {
    try {
      const latestBlock = await this.chainsService.executeRpcCall(
        chain,
        'eth_blockNumber',
        []
      ) as string;

      const blockNumber = parseInt(latestBlock, 16);
      const fromBlock = `0x${(blockNumber - 100).toString(16)}`;
      const toBlock = `0x${blockNumber.toString(16)}`;

      const logs = await this.chainsService.executeRpcCall(
        chain,
        'eth_getLogs',
        [{
          address: tokenAddress,
          fromBlock,
          toBlock,
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
          ]
        }]
      ) as Array<{
        topics: string[];
        data: string;
        transactionHash: string;
      }>;

      for (const log of logs) {
        await this.analyzeTransfer(chain, tokenAddress, log);
      }
    } catch (error) {
      logger.error(`Whale scan error for ${tokenAddress} on ${chain}:`, error);
    }
  }

  private async analyzeTransfer(
    chain: string,
    tokenAddress: string,
    log: { topics: string[]; data: string; transactionHash: string }
  ): Promise<void> {
    try {
      const from = '0x' + log.topics[1].slice(26);
      const to = '0x' + log.topics[2].slice(26);
      const amount = ethers.getBigInt(log.data);

      const decimals = await this.getTokenDecimals(chain, tokenAddress);
      const amountFormatted = ethers.formatUnits(amount, decimals);
      const amountUsd = await this.estimateUsdValue(parseFloat(amountFormatted));

      const classification = this.classifyWhale(amountUsd);
      
      if (classification) {
        const type = this.determineTransferType(from, to);
        
        await this.recordWhaleActivity({
          chain,
          tokenAddress,
          walletAddress: type === 'buy' ? to : from,
          classification: classification.type,
          amount: amountFormatted,
          amountUsd,
          type,
          txHash: log.transactionHash,
          metadata: {
            from,
            to,
            blockNumber: log.transactionHash,
          },
        });

        logger.info(`${classification.type.toUpperCase()} whale detected: $${amountUsd.toLocaleString()} ${type} on ${chain}`);
      }
    } catch (error) {
      logger.error('Transfer analysis error:', error);
    }
  }

  private classifyWhale(amountUsd: number): WhaleClassification | null {
    for (const classification of WHALE_THRESHOLDS) {
      if (amountUsd >= classification.threshold) {
        return classification;
      }
    }
    return null;
  }

  private determineTransferType(from: string, to: string): string {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    
    if (from.toLowerCase() === zeroAddress) return 'mint';
    if (to.toLowerCase() === zeroAddress) return 'burn';
    
    const knownDexAddresses = [
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
      '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
    ];

    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    if (knownDexAddresses.some(dex => fromLower === dex.toLowerCase())) {
      return 'buy';
    }
    if (knownDexAddresses.some(dex => toLower === dex.toLowerCase())) {
      return 'sell';
    }

    return 'transfer';
  }

  private async getTokenDecimals(chain: string, tokenAddress: string): Promise<number> {
    try {
      const data = '0x313ce567';
      const result = await this.chainsService.executeRpcCall(
        chain,
        'eth_call',
        [{ to: tokenAddress, data }, 'latest']
      ) as string;

      return parseInt(result, 16);
    } catch (error) {
      return 18;
    }
  }

  private async estimateUsdValue(amount: number): Promise<number> {
    return amount * 1;
  }

  private async recordWhaleActivity(data: {
    chain: string;
    tokenAddress: string;
    walletAddress: string;
    classification: string;
    amount: string;
    amountUsd: number;
    type: string;
    txHash: string;
    metadata: unknown;
  }): Promise<void> {
    await prisma.whaleActivity.create({
      data: {
        chain: data.chain,
        tokenAddress: data.tokenAddress,
        walletAddress: data.walletAddress,
        classification: data.classification,
        amount: data.amount,
        amountUsd: data.amountUsd,
        type: data.type,
        txHash: data.txHash,
        metadata: data.metadata as any,
      },
    });
  }

  async getRecentWhaleActivity(limit: number = 50) {
    return prisma.whaleActivity.findMany({
      take: limit,
      orderBy: { detectedAt: 'desc' },
    });
  }

  async getWhaleActivityByToken(chain: string, tokenAddress: string, limit: number = 50) {
    return prisma.whaleActivity.findMany({
      where: { chain, tokenAddress },
      take: limit,
      orderBy: { detectedAt: 'desc' },
    });
  }
}
