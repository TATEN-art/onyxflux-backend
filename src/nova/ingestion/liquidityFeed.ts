import { ethers } from 'ethers';
import env from '../../config/env';
import { LiquidityData } from '../types';
import { logger } from '../../utils/logger';

const UNISWAP_V3_POOL_ABI = [
  'function liquidity() external view returns (uint128)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'event Mint(address indexed sender, address indexed owner, int24 indexed tickLower, int24 tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
  'event Burn(address indexed owner, int24 indexed tickLower, int24 tickUpper, uint128 amount, uint256 amount0, uint256 amount1)',
];

interface LiquidityFeedConfig {
  chain: 'ethereum' | 'base';
  rpcUrl: string;
  provider: ethers.JsonRpcProvider;
}

class LiquidityFeedService {
  private configs: Map<string, LiquidityFeedConfig> = new Map();
  private liquidityCache: Map<string, { liquidity: number; timestamp: Date }> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const chains: Array<{ name: 'ethereum' | 'base'; rpcUrl: string }> = [
      { name: 'ethereum', rpcUrl: env.ETH_RPC_URL },
      { name: 'base', rpcUrl: env.BASE_RPC_URL },
    ];

    for (const { name, rpcUrl } of chains) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        this.configs.set(name, { chain: name, rpcUrl, provider });
        this.reconnectAttempts.set(name, 0);
        logger.info(`Liquidity feed initialized for ${name}`);
      } catch (error) {
        logger.error(`Failed to initialize liquidity feed for ${name}:`, error);
      }
    }
  }

  async reconnect(chain: string): Promise<boolean> {
    const attempts = this.reconnectAttempts.get(chain) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts reached for ${chain}`);
      return false;
    }

    try {
      const config = this.configs.get(chain);
      if (!config) return false;

      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.configs.set(chain, { ...config, provider });
      this.reconnectAttempts.set(chain, 0);
      logger.info(`Reconnected liquidity feed for ${chain}`);
      return true;
    } catch (error) {
      this.reconnectAttempts.set(chain, attempts + 1);
      logger.error(`Reconnect failed for ${chain}:`, error);
      return false;
    }
  }

  async getPoolLiquidity(
    poolAddress: string,
    symbol: string,
    chain: 'ethereum' | 'base'
  ): Promise<LiquidityData | null> {
    try {
      const config = this.configs.get(chain);
      if (!config) {
        logger.error(`No config found for chain: ${chain}`);
        return null;
      }

      const { provider } = config;
      const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);

      const currentLiquidity = await poolContract.liquidity();
      const liquidityValue = Number(currentLiquidity);

      const cacheKey = `${chain}:${poolAddress}`;
      const cached = this.liquidityCache.get(cacheKey);

      let liquidityChange = 0;
      let direction: 'increase' | 'decrease' = 'increase';

      if (cached) {
        liquidityChange = ((liquidityValue - cached.liquidity) / cached.liquidity) * 100;
        direction = liquidityChange >= 0 ? 'increase' : 'decrease';
      }

      this.liquidityCache.set(cacheKey, {
        liquidity: liquidityValue,
        timestamp: new Date(),
      });

      const severity = this.calculateSeverity(Math.abs(liquidityChange));

      const liquidityData: LiquidityData = {
        symbol,
        chain,
        poolAddress,
        liquidity: liquidityValue,
        liquidityChange: Math.abs(liquidityChange),
        direction,
        severity,
        timestamp: new Date(),
      };

      return liquidityData;
    } catch (error) {
      logger.error(`Error fetching liquidity for ${poolAddress} on ${chain}:`, error);
      await this.reconnect(chain);
      return null;
    }
  }

  private calculateSeverity(changePercent: number): 'low' | 'medium' | 'high' {
    if (changePercent < 5) return 'low';
    if (changePercent < 15) return 'medium';
    return 'high';
  }

  async monitorLiquidityEvents(
    poolAddress: string,
    symbol: string,
    chain: 'ethereum' | 'base',
    callback: (data: LiquidityData) => void
  ): Promise<void> {
    try {
      const config = this.configs.get(chain);
      if (!config) return;

      const { provider } = config;
      const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);

      poolContract.on('Mint', async () => {
        const data = await this.getPoolLiquidity(poolAddress, symbol, chain);
        if (data) callback(data);
      });

      poolContract.on('Burn', async () => {
        const data = await this.getPoolLiquidity(poolAddress, symbol, chain);
        if (data) callback(data);
      });

      logger.info(`Monitoring liquidity events for ${symbol} on ${chain}`);
    } catch (error) {
      logger.error(`Error monitoring liquidity events:`, error);
      await this.reconnect(chain);
    }
  }

  startLiquidityMonitoring(
    poolAddress: string,
    symbol: string,
    chain: 'ethereum' | 'base',
    callback: (data: LiquidityData) => void
  ): NodeJS.Timeout {
    const interval = setInterval(async () => {
      const data = await this.getPoolLiquidity(poolAddress, symbol, chain);
      if (data && Math.abs(data.liquidityChange) > 1) {
        callback(data);
      }
    }, 10000);

    this.monitorLiquidityEvents(poolAddress, symbol, chain, callback);

    return interval;
  }

  stopLiquidityMonitoring(interval: NodeJS.Timeout) {
    clearInterval(interval);
  }
}

export const liquidityFeedService = new LiquidityFeedService();
