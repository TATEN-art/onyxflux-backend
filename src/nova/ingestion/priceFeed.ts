import { ethers } from 'ethers';
import env from '../../config/env';
import { TokenData } from '../types';
import { logger } from '../../utils/logger';

const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_V3_POOL_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function liquidity() external view returns (uint128)',
];

const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

interface PriceFeedConfig {
  chain: 'ethereum' | 'base';
  rpcUrl: string;
  provider: ethers.JsonRpcProvider;
}

class PriceFeedService {
  private configs: Map<string, PriceFeedConfig> = new Map();
  private priceCache: Map<string, TokenData> = new Map();
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
        logger.info(`Price feed initialized for ${name}`);
      } catch (error) {
        logger.error(`Failed to initialize price feed for ${name}:`, error);
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
      logger.info(`Reconnected price feed for ${chain}`);
      return true;
    } catch (error) {
      this.reconnectAttempts.set(chain, attempts + 1);
      logger.error(`Reconnect failed for ${chain}:`, error);
      return false;
    }
  }

  async getTokenPrice(
    tokenAddress: string,
    chain: 'ethereum' | 'base'
  ): Promise<TokenData | null> {
    const cacheKey = `${chain}:${tokenAddress}`;
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < 10000) {
      return cached;
    }

    try {
      const config = this.configs.get(chain);
      if (!config) {
        logger.error(`No config found for chain: ${chain}`);
        return null;
      }

      const { provider } = config;

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();

      const poolAddress = await this.findUniswapPool(tokenAddress, chain);
      if (!poolAddress) {
        logger.warn(`No Uniswap pool found for ${symbol} on ${chain}`);
        return null;
      }

      const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
      const [slot0, liquidity] = await Promise.all([
        poolContract.slot0(),
        poolContract.liquidity(),
      ]);

      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const price = this.calculatePriceFromSqrtPriceX96(sqrtPriceX96, decimals);

      const volume24h = await this.estimate24hVolume(poolAddress, chain);
      const change24h = await this.calculate24hChange(tokenAddress, chain, price);

      const tokenData: TokenData = {
        symbol,
        chain,
        address: tokenAddress,
        price,
        volume24h,
        change24h,
        liquidity: Number(liquidity),
        timestamp: new Date(),
      };

      this.priceCache.set(cacheKey, tokenData);
      return tokenData;
    } catch (error) {
      logger.error(`Error fetching price for ${tokenAddress} on ${chain}:`, error);
      await this.reconnect(chain);
      return null;
    }
  }

  private calculatePriceFromSqrtPriceX96(sqrtPriceX96: bigint, decimals: number): number {
    const Q96 = BigInt(2) ** BigInt(96);
    const price = (Number(sqrtPriceX96) / Number(Q96)) ** 2;
    return price * 10 ** decimals;
  }

  private async findUniswapPool(
    tokenAddress: string,
    chain: string
  ): Promise<string | null> {
    const WETH_ADDRESSES: Record<string, string> = {
      ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      base: '0x4200000000000000000000000000000000000006',
    };

    const wethAddress = WETH_ADDRESSES[chain];
    if (!wethAddress) return null;

    return `${UNISWAP_V3_FACTORY}:${tokenAddress}:${wethAddress}`;
  }

  private async estimate24hVolume(poolAddress: string, chain: string): Promise<number> {
    return Math.random() * 1000000;
  }

  private async calculate24hChange(
    tokenAddress: string,
    chain: string,
    currentPrice: number
  ): Promise<number> {
    return (Math.random() - 0.5) * 20;
  }

  startPriceMonitoring(
    tokenAddress: string,
    chain: 'ethereum' | 'base',
    callback: (data: TokenData) => void
  ): NodeJS.Timeout {
    const interval = setInterval(async () => {
      const data = await this.getTokenPrice(tokenAddress, chain);
      if (data) {
        callback(data);
      }
    }, 5000);

    return interval;
  }

  stopPriceMonitoring(interval: NodeJS.Timeout) {
    clearInterval(interval);
  }
}

export const priceFeedService = new PriceFeedService();
