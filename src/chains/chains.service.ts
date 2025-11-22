import { ethers } from 'ethers';
import { config } from '../config/env';
import { Logger } from '../utils/logger';
import redis from '../config/redis';

const logger = new Logger('ChainsService');

export class ChainsService {
  private providers: Map<string, ethers.JsonRpcProvider[]> = new Map();
  private currentProviderIndex: Map<string, number> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const chains = {
      ethereum: [config.rpc.ethereum],
      polygon: [config.rpc.polygon],
      arbitrum: [config.rpc.arbitrum],
      optimism: [config.rpc.optimism],
      base: [config.rpc.base],
      bsc: [config.rpc.bsc],
      avalanche: [config.rpc.avalanche],
      fantom: [config.rpc.fantom],
      cronos: [config.rpc.cronos],
      linea: [config.rpc.linea],
      scroll: [config.rpc.scroll],
      zksync: [config.rpc.zksync],
    };

    for (const [chain, rpcUrls] of Object.entries(chains)) {
      const providers = rpcUrls
        .filter(url => url)
        .map(url => new ethers.JsonRpcProvider(url));
      
      if (providers.length > 0) {
        this.providers.set(chain, providers);
        this.currentProviderIndex.set(chain, 0);
      }
    }

    logger.info(`Initialized ${this.providers.size} chain providers`);
  }

  private getProvider(chain: string): ethers.JsonRpcProvider | null {
    const providers = this.providers.get(chain);
    if (!providers || providers.length === 0) {
      return null;
    }

    const index = this.currentProviderIndex.get(chain) || 0;
    return providers[index];
  }

  private rotateProvider(chain: string): void {
    const providers = this.providers.get(chain);
    if (!providers || providers.length <= 1) {
      return;
    }

    const currentIndex = this.currentProviderIndex.get(chain) || 0;
    const nextIndex = (currentIndex + 1) % providers.length;
    this.currentProviderIndex.set(chain, nextIndex);
    
    logger.warn(`Rotated to backup provider for ${chain}`);
  }

  async executeRpcCall(
    chain: string,
    method: string,
    params: unknown[] = []
  ): Promise<unknown> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = this.getProvider(chain);
      
      if (!provider) {
        throw new Error(`Chain ${chain} not supported`);
      }

      try {
        const startTime = Date.now();
        const result = await provider.send(method, params);
        const latency = Date.now() - startTime;

        await this.recordMetrics(chain, method, latency, true);

        return result;
      } catch (error) {
        lastError = error as Error;
        logger.error(`RPC call failed for ${chain} (attempt ${attempt + 1}):`, error);

        await this.recordMetrics(chain, method, 0, false);

        if (attempt < maxRetries - 1) {
          this.rotateProvider(chain);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('RPC call failed');
  }

  private async recordMetrics(
    chain: string,
    method: string,
    latency: number,
    success: boolean
  ): Promise<void> {
    const key = `metrics:rpc:${chain}:${method}`;
    const data = { latency, success, timestamp: Date.now() };
    
    await redis.lpush(key, JSON.stringify(data));
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, 86400);
  }

  async getChainStatus(chain: string): Promise<{
    available: boolean;
    latency: number | null;
    blockNumber: number | null;
  }> {
    try {
      const provider = this.getProvider(chain);
      if (!provider) {
        return { available: false, latency: null, blockNumber: null };
      }

      const startTime = Date.now();
      const blockNumber = await provider.getBlockNumber();
      const latency = Date.now() - startTime;

      return { available: true, latency, blockNumber };
    } catch (error) {
      logger.error(`Failed to get status for ${chain}:`, error);
      return { available: false, latency: null, blockNumber: null };
    }
  }

  async getAllChainsStatus(): Promise<Record<string, {
    available: boolean;
    latency: number | null;
    blockNumber: number | null;
  }>> {
    const chains = Array.from(this.providers.keys());
    const statuses: Record<string, {
      available: boolean;
      latency: number | null;
      blockNumber: number | null;
    }> = {};

    await Promise.all(
      chains.map(async (chain) => {
        statuses[chain] = await this.getChainStatus(chain);
      })
    );

    return statuses;
  }

  getSupportedChains(): string[] {
    return Array.from(this.providers.keys());
  }
}
