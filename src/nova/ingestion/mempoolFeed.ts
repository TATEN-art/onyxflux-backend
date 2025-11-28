import { ethers } from 'ethers';
import env from '../../config/env';
import { MempoolTransaction } from '../types';
import { logger } from '../../utils/logger';

interface MempoolFeedConfig {
  chain: 'ethereum' | 'base';
  rpcUrl: string;
  provider: ethers.JsonRpcProvider;
  wsProvider?: ethers.WebSocketProvider;
}

class MempoolFeedService {
  private configs: Map<string, MempoolFeedConfig> = new Map();
  private pendingTransactions: Map<string, MempoolTransaction[]> = new Map();
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
        this.pendingTransactions.set(name, []);
        logger.info(`Mempool feed initialized for ${name}`);
      } catch (error) {
        logger.error(`Failed to initialize mempool feed for ${name}:`, error);
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
      logger.info(`Reconnected mempool feed for ${chain}`);
      return true;
    } catch (error) {
      this.reconnectAttempts.set(chain, attempts + 1);
      logger.error(`Reconnect failed for ${chain}:`, error);
      return false;
    }
  }

  async monitorMempool(
    chain: 'ethereum' | 'base',
    tokenAddress: string,
    callback: (transaction: MempoolTransaction) => void
  ): Promise<void> {
    try {
      const config = this.configs.get(chain);
      if (!config) return;

      const { provider } = config;

      provider.on('pending', async (txHash: string) => {
        try {
          const tx = await provider.getTransaction(txHash);
          if (!tx) return;

          if (
            tx.to &&
            tx.to.toLowerCase() === tokenAddress.toLowerCase() &&
            tx.gasPrice
          ) {
            const mempoolTx: MempoolTransaction = {
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: Number(ethers.formatEther(tx.value)),
              gasPrice: Number(ethers.formatUnits(tx.gasPrice, 'gwei')),
              timestamp: new Date(),
            };

            const pending = this.pendingTransactions.get(chain) || [];
            pending.push(mempoolTx);
            this.pendingTransactions.set(chain, pending);

            callback(mempoolTx);

            logger.info(
              `Mempool transaction detected on ${chain}: ${txHash.substring(0, 10)}...`
            );
          }
        } catch (error) {
          logger.error('Error processing mempool transaction:', error);
        }
      });

      logger.info(`Monitoring mempool for ${tokenAddress} on ${chain}`);
    } catch (error) {
      logger.error(`Error setting up mempool monitoring:`, error);
      await this.reconnect(chain);
    }
  }

  async getPendingTransactions(
    chain: 'ethereum' | 'base',
    limit: number = 50
  ): Promise<MempoolTransaction[]> {
    const pending = this.pendingTransactions.get(chain) || [];
    return pending.slice(-limit);
  }

  async detectLargeTransactions(
    chain: 'ethereum' | 'base',
    thresholdEth: number = 10
  ): Promise<MempoolTransaction[]> {
    const pending = this.pendingTransactions.get(chain) || [];
    return pending.filter((tx) => tx.value >= thresholdEth);
  }

  async detectHighGasTransactions(
    chain: 'ethereum' | 'base',
    thresholdGwei: number = 100
  ): Promise<MempoolTransaction[]> {
    const pending = this.pendingTransactions.get(chain) || [];
    return pending.filter((tx) => tx.gasPrice >= thresholdGwei);
  }

  clearPendingTransactions(chain: string) {
    this.pendingTransactions.set(chain, []);
  }

  stopMempoolMonitoring(chain: 'ethereum' | 'base') {
    try {
      const config = this.configs.get(chain);
      if (!config) return;

      const { provider } = config;
      provider.removeAllListeners('pending');

      logger.info(`Stopped mempool monitoring for ${chain}`);
    } catch (error) {
      logger.error(`Error stopping mempool monitoring:`, error);
    }
  }
}

export const mempoolFeedService = new MempoolFeedService();
