import { ethers } from 'ethers';
import prisma from '../../config/database';
import { Logger } from '../../utils/logger';
import { ChainsService } from '../../chains/chains.service';

const logger = new Logger('LiquidityService');

const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];

export class LiquidityService {
  private chainsService: ChainsService;
  private scanInterval: NodeJS.Timeout | null = null;
  private monitoredPools: Map<string, Set<string>> = new Map();

  constructor(chainsService: ChainsService) {
    this.chainsService = chainsService;
  }

  startScanning(): void {
    if (this.scanInterval) {
      logger.warn('Liquidity scanning already running');
      return;
    }

    logger.info('Starting liquidity scanner (30-second cycles)');
    
    this.scanInterval = setInterval(async () => {
      await this.scanLiquidity();
    }, 30000);

    this.scanLiquidity();
  }

  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      logger.info('Liquidity scanning stopped');
    }
  }

  addPoolToMonitor(chain: string, poolAddress: string): void {
    if (!this.monitoredPools.has(chain)) {
      this.monitoredPools.set(chain, new Set());
    }
    this.monitoredPools.get(chain)!.add(poolAddress.toLowerCase());
    logger.info(`Added pool ${poolAddress} on ${chain} to liquidity monitoring`);
  }

  private async scanLiquidity(): Promise<void> {
    try {
      const chains = this.chainsService.getSupportedChains();
      
      for (const chain of chains) {
        const pools = this.monitoredPools.get(chain);
        if (!pools || pools.size === 0) continue;

        for (const poolAddress of pools) {
          await this.scanPool(chain, poolAddress);
        }
      }
    } catch (error) {
      logger.error('Liquidity scanning error:', error);
    }
  }

  private async scanPool(chain: string, poolAddress: string): Promise<void> {
    try {
      const reserves = await this.getPoolReserves(chain, poolAddress);
      const tokenAddress = await this.getToken0(chain, poolAddress);
      
      const liquidityUsd = this.estimateLiquidityUsd(
        parseFloat(ethers.formatEther(reserves.reserve0)),
        parseFloat(ethers.formatEther(reserves.reserve1))
      );

      const volume24h = await this.estimate24hVolume(chain, poolAddress);
      const healthScore = this.calculateHealthScore(liquidityUsd, volume24h);

      await this.recordLiquiditySnapshot({
        chain,
        tokenAddress,
        poolAddress,
        liquidityUsd,
        volume24h,
        healthScore,
        metadata: {
          reserve0: reserves.reserve0.toString(),
          reserve1: reserves.reserve1.toString(),
        },
      });

      if (healthScore < 0.3) {
        logger.warn(`Low liquidity health score (${healthScore.toFixed(2)}) for pool ${poolAddress} on ${chain}`);
      }
    } catch (error) {
      logger.error(`Liquidity scan error for pool ${poolAddress} on ${chain}:`, error);
    }
  }

  private async getPoolReserves(chain: string, poolAddress: string): Promise<{
    reserve0: bigint;
    reserve1: bigint;
  }> {
    const data = '0x0902f1ac';
    const result = await this.chainsService.executeRpcCall(
      chain,
      'eth_call',
      [{ to: poolAddress, data }, 'latest']
    ) as string;

    const reserve0 = ethers.getBigInt('0x' + result.slice(2, 66));
    const reserve1 = ethers.getBigInt('0x' + result.slice(66, 130));

    return { reserve0, reserve1 };
  }

  private async getToken0(chain: string, poolAddress: string): Promise<string> {
    const data = '0x0dfe1681';
    const result = await this.chainsService.executeRpcCall(
      chain,
      'eth_call',
      [{ to: poolAddress, data }, 'latest']
    ) as string;

    return '0x' + result.slice(26);
  }

  private estimateLiquidityUsd(reserve0: number, reserve1: number): number {
    return (reserve0 + reserve1) * 1000;
  }

  private async estimate24hVolume(chain: string, poolAddress: string): Promise<number> {
    return Math.random() * 1000000;
  }

  private calculateHealthScore(liquidityUsd: number, volume24h: number): number {
    let score = 0.5;

    if (liquidityUsd > 10000000) score += 0.3;
    else if (liquidityUsd > 1000000) score += 0.2;
    else if (liquidityUsd > 100000) score += 0.1;
    else if (liquidityUsd < 10000) score -= 0.3;

    const volumeToLiquidityRatio = volume24h / liquidityUsd;
    if (volumeToLiquidityRatio > 0.5) score += 0.2;
    else if (volumeToLiquidityRatio > 0.2) score += 0.1;
    else if (volumeToLiquidityRatio < 0.05) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private async recordLiquiditySnapshot(data: {
    chain: string;
    tokenAddress: string;
    poolAddress: string;
    liquidityUsd: number;
    volume24h: number;
    healthScore: number;
    metadata: unknown;
  }): Promise<void> {
    await prisma.liquiditySnapshot.create({
      data: {
        chain: data.chain,
        tokenAddress: data.tokenAddress,
        poolAddress: data.poolAddress,
        liquidityUsd: data.liquidityUsd,
        volume24h: data.volume24h,
        healthScore: data.healthScore,
        metadata: data.metadata as any,
      },
    });
  }

  async getLiquidityHistory(chain: string, tokenAddress: string, limit: number = 100) {
    return prisma.liquiditySnapshot.findMany({
      where: { chain, tokenAddress },
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }

  async getCurrentLiquidity(chain: string, tokenAddress: string) {
    return prisma.liquiditySnapshot.findFirst({
      where: { chain, tokenAddress },
      orderBy: { timestamp: 'desc' },
    });
  }
}
