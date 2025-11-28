export type TokenChain = 'ethereum' | 'base' | 'bnb' | 'solana';

export interface TokenFeatures {
  mintable: boolean;
  burnable: boolean;
  liquidityTax: number;
  marketingTax: number;
  antiWhale: boolean;
  antiBot: boolean;
}

export interface TokenCreateInput {
  blockchain: TokenChain;
  name: string;
  symbol: string;
  totalSupply: number;
  decimals: number;
  features: TokenFeatures;
  uploadLogo?: string;
  verifyOnExplorer: boolean;
  destinationWallet: string;
}

export interface TokenDeploymentData {
  bytecode?: string;
  abi?: any[];
  constructorArgs?: any[];
  recommendedGas?: string;
  transactionInstructions?: any;
  metadataUpload?: any;
  mintAddress?: string;
}

export interface TokenGenerationResult {
  tokenId: string;
  contractSource: string;
  deploymentData: TokenDeploymentData;
  deploymentInstructions: string;
  explorerVerificationInstructions?: string;
}

export interface TokenMetadata {
  id: string;
  userId: string;
  chain: TokenChain;
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  logo: string | null;
  features: TokenFeatures;
  contractSource: string;
  deploymentData: TokenDeploymentData;
  contractAddress: string | null;
  txHash: string | null;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentLog {
  id: string;
  tokenId: string;
  txHash: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
}

export const CHAIN_CONFIGS = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: process.env.ETH_RPC_URL || '',
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/api',
    currency: 'ETH',
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || '',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.basescan.org/api',
    currency: 'ETH',
  },
  bnb: {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: process.env.BNB_RPC_URL || '',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com/api',
    currency: 'BNB',
  },
  solana: {
    name: 'Solana',
    chainId: 0,
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    explorer: 'https://solscan.io',
    explorerApi: '',
    currency: 'SOL',
  },
};

export const PLAN_TOKEN_LIMITS = {
  free: 0,
  pro: 2,
  enterprise: 10,
};
