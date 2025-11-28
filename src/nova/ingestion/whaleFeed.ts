import { ethers } from 'ethers';
import env from '../../config/env';
import { WhaleTransaction } from '../types';
import { logger } from '../../utils/logger';

const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function totalSupply() external view returns (uint256)',
];

const WHALE_THRESHOLD_PERCENT = 0.5;

interface WhaleFeedConfig {
  chain: 'ethereum' | 'base';
  rpcUrl: string;
  provider: ethers.JsonRpcProvider;
}

class WhaleFeedService {
  private configs: Map<string, WhaleFeedConfig> = new Map();
  private knownWhales: Map<string, Set<string>> = new Map();
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
        this.knownWhales.set(name, new Set());
        logger.info(`Whale feed initialized for ${name}`);
      } catch (error) {
        logger.error(`Failed to initialize whale feed for ${name}:`, error);
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
      logger.info(`Reconnected whale feed for ${chain}`);
      return true;
    } catch (error) {
      this.reconnectAttempts.set(chain, attempts + 1);
      logger.error(`Reconnect failed for ${chain}:`, error);
      return false;
    }
  }

  async monitorWhaleTransactions(
    tokenAddress: string,
    chain: 'ethereum' | 'base',
    callback: (transaction: WhaleTransaction) => void
  ): Promise<void> {
    try {
      const config = this.configs.get(chain);
      if (!config) return;

      const { provider } = config;
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const [symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
      ]);

      const whaleThreshold = (Number(totalSupply) * WHALE_THRESHOLD_PERCENT) / 100;

      tokenContract.on('Transfer', async (from: string, to: string, value: bigint) => {
        try {
          const amount = Number(value) / 10 ** Number(decimals);

          if (amount >= whaleThreshold) {
            const isFromZero = from === ethers.ZeroAddress;
            const isToZero = to === ethers.ZeroAddress;

            if (isFromZero || isToZero) return;

            const direction: 'buy' | 'sell' = this.determineDirection(from, to);
            const impact = this.calculateImpact(amount, Number(totalSupply));

            const whaleTransaction: WhaleTransaction = {
              symbol,
              chain,
              walletAddress: direction === 'buy' ? to : from,
              amount,
              direction,
              impact,
              timestamp: new Date(),
            };

            this.trackWhale(chain, whaleTransaction.walletAddress);
            callback(whaleTransaction);

            logger.info(
              `Whale ${direction} detected: ${amount} ${symbol} by ${whaleTransaction.walletAddress}`
            );
          }
        } catch (error) {
          logger.error('Error processing whale transaction:', error);
        }
      });

      logger.info(`Monitoring whale transactions for ${symbol} on ${chain}`);
    } catch (error) {
      logger.error(`Error setting up whale monitoring:`, error);
      await this.reconnect(chain);
    }
  }

  private determineDirection(from: string, to: string): 'buy' | 'sell' {
    const DEX_ADDRESSES = [
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ];

    const isFromDex = DEX_ADDRESSES.some((dex) => from.toLowerCase() === dex.toLowerCase());
    const isToDex = DEX_ADDRESSES.some((dex) => to.toLowerCase() === dex.toLowerCase());

    if (isFromDex) return 'buy';
    if (isToDex) return 'sell';

    return 'buy';
  }

  private calculateImpact(amount: number, totalSupply: number): 'low' | 'medium' | 'high' {
    const percentOfSupply = (amount / totalSupply) * 100;

    if (percentOfSupply < 0.5) return 'low';
    if (percentOfSupply < 2) return 'medium';
    return 'high';
  }

  private trackWhale(chain: string, walletAddress: string) {
    const whales = this.knownWhales.get(chain);
    if (whales) {
      whales.add(walletAddress);
    }
  }

  getKnownWhales(chain: string): string[] {
    const whales = this.knownWhales.get(chain);
    return whales ? Array.from(whales) : [];
  }

  async getWhaleActivity(
    tokenAddress: string,
    chain: 'ethereum' | 'base',
    timeframeMinutes: number = 60
  ): Promise<WhaleTransaction[]> {
    try {
      const config = this.configs.get(chain);
      if (!config) return [];

      const { provider } = config;
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const currentBlock = await provider.getBlockNumber();
      const blocksToCheck = Math.floor((timeframeMinutes * 60) / 12);
      const fromBlock = currentBlock - blocksToCheck;

      const filter = tokenContract.filters.Transfer();
      const events = await tokenContract.queryFilter(filter, fromBlock, currentBlock);

      const [symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
      ]);

      const whaleThreshold = (Number(totalSupply) * WHALE_THRESHOLD_PERCENT) / 100;
      const whaleTransactions: WhaleTransaction[] = [];

      for (const event of events) {
        const args = event.args;
        if (!args) continue;

        const amount = Number(args.value) / 10 ** Number(decimals);

        if (amount >= whaleThreshold) {
          const from = args.from;
          const to = args.to;

          if (from === ethers.ZeroAddress || to === ethers.ZeroAddress) continue;

          const direction = this.determineDirection(from, to);
          const impact = this.calculateImpact(amount, Number(totalSupply));

          whaleTransactions.push({
            symbol,
            chain,
            walletAddress: direction === 'buy' ? to : from,
            amount,
            direction,
            impact,
            timestamp: new Date(),
          });
        }
      }

      return whaleTransactions;
    } catch (error) {
      logger.error(`Error fetching whale activity:`, error);
      await this.reconnect(chain);
      return [];
    }
  }
}

export const whaleFeedService = new WhaleFeedService();
