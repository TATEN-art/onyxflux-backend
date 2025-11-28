import { PrismaClient } from '@prisma/client';
import {
  TokenCreateInput,
  TokenGenerationResult,
  TokenMetadata,
  TokenDeploymentData,
  PLAN_TOKEN_LIMITS,
} from './types';
import { evmContractGenerator } from './evmContractGenerator';
import { solanaTokenGenerator } from './solanaTokenGenerator';
import { logoProcessor } from './logoProcessor';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

class TokenService {
  async createToken(userId: string, userPlan: string, input: TokenCreateInput): Promise<TokenGenerationResult> {
    try {
      const tokenCount = await prisma.token.count({
        where: { userId },
      });

      const planLimit = PLAN_TOKEN_LIMITS[userPlan as keyof typeof PLAN_TOKEN_LIMITS] || 0;

      if (tokenCount >= planLimit) {
        throw new Error(`Token generation limit reached for ${userPlan} plan. Limit: ${planLimit}`);
      }

      let processedLogo: string | null = null;
      if (input.uploadLogo) {
        const isValid = await logoProcessor.validateLogo(input.uploadLogo);
        if (!isValid) {
          throw new Error('Invalid logo image. Must be a valid image under 5MB.');
        }
        processedLogo = await logoProcessor.processLogo(input.uploadLogo);
      }

      let contractSource: string;
      let deploymentData: TokenDeploymentData;
      let deploymentInstructions: string;

      if (input.blockchain === 'solana') {
        contractSource = solanaTokenGenerator.generateAnchorProgram(input);
        const instructions = solanaTokenGenerator.generateTokenInstructions(input);
        deploymentData = {
          transactionInstructions: instructions.instructions,
          metadataUpload: instructions.metadata,
        };
        deploymentInstructions = solanaTokenGenerator.generateDeploymentInstructions(input);
      } else {
        contractSource = evmContractGenerator.generateContract(input);
        deploymentData = await this.compileEVMContract(contractSource, input);
        deploymentInstructions = this.generateEVMDeploymentInstructions(input, deploymentData);
      }

      const token = await prisma.token.create({
        data: {
          userId,
          chain: input.blockchain,
          name: input.name,
          symbol: input.symbol,
          totalSupply: input.totalSupply.toString(),
          decimals: input.decimals,
          logo: processedLogo,
          features: input.features as any,
          contractSource,
          deploymentData: deploymentData as any,
        },
      });

      await prisma.deploymentLog.create({
        data: {
          tokenId: token.id,
          status: 'pending',
        },
      });

      logger.info(`Token ${token.id} created for user ${userId} on ${input.blockchain}`);

      const explorerVerificationInstructions = input.verifyOnExplorer
        ? this.generateVerificationInstructions(input.blockchain, input.name)
        : undefined;

      return {
        tokenId: token.id,
        contractSource,
        deploymentData,
        deploymentInstructions,
        explorerVerificationInstructions,
      };
    } catch (error) {
      logger.error('Error creating token:', error);
      throw error;
    }
  }

  private async compileEVMContract(
    contractSource: string,
    input: TokenCreateInput
  ): Promise<TokenDeploymentData> {
    const mockBytecode = '0x' + '60806040'.repeat(100); // Mock bytecode
    const mockABI = [
      {
        inputs: [],
        stateMutability: 'nonpayable',
        type: 'constructor',
      },
      {
        inputs: [],
        name: 'name',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];

    const recommendedGas = '3000000';

    return {
      bytecode: mockBytecode,
      abi: mockABI,
      constructorArgs: [],
      recommendedGas,
    };
  }

  private generateEVMDeploymentInstructions(
    input: TokenCreateInput,
    deploymentData: TokenDeploymentData
  ): string {
    const chainName = input.blockchain === 'ethereum' ? 'Ethereum' : input.blockchain === 'base' ? 'Base' : 'BNB Smart Chain';

    return `# ${chainName} Token Deployment Instructions

## Prerequisites
- MetaMask or compatible Web3 wallet
- Sufficient ${input.blockchain === 'bnb' ? 'BNB' : 'ETH'} for gas fees (~0.05 ${input.blockchain === 'bnb' ? 'BNB' : 'ETH'})
- Remix IDE: https://remix.ethereum.org

## Step 1: Open Remix IDE
Visit https://remix.ethereum.org

## Step 2: Create New File
Create a new file named "${input.name}.sol" and paste the contract source code provided.

## Step 3: Compile Contract
1. Click on the "Solidity Compiler" tab
2. Select compiler version 0.8.20 or higher
3. Click "Compile ${input.name}.sol"
4. Ensure compilation succeeds with no errors

## Step 4: Deploy Contract
1. Click on the "Deploy & Run Transactions" tab
2. Select "Injected Provider - MetaMask" as environment
3. Ensure your wallet is connected to ${chainName}
4. Set gas limit to ${deploymentData.recommendedGas || '3000000'}
5. Click "Deploy"
6. Confirm transaction in MetaMask

## Step 5: Save Contract Address
After deployment, copy the contract address from Remix.
Save this address - you'll need it for verification.

## Step 6: Verify Contract (Optional)
${input.verifyOnExplorer ? 'See verification instructions below.' : 'Verification not requested.'}

Your ${input.name} token is now deployed on ${chainName}!`;
  }

  private generateVerificationInstructions(blockchain: string, tokenName: string): string {
    const explorerName = blockchain === 'ethereum' ? 'Etherscan' : blockchain === 'base' ? 'BaseScan' : 'BscScan';
    const explorerUrl = blockchain === 'ethereum' ? 'https://etherscan.io' : blockchain === 'base' ? 'https://basescan.org' : 'https://bscscan.com';

    return `# ${explorerName} Verification Instructions

## Step 1: Visit ${explorerName}
Go to ${explorerUrl}/verifyContract

## Step 2: Enter Contract Details
- Contract Address: [Your deployed contract address]
- Compiler Type: Solidity (Single file)
- Compiler Version: v0.8.20+commit.a1b79de6
- License Type: MIT

## Step 3: Paste Contract Source
Copy the entire contract source code and paste it into the verification form.

## Step 4: Constructor Arguments (if any)
Leave blank unless your contract has constructor arguments.

## Step 5: Submit for Verification
Click "Verify and Publish" and wait for verification to complete.

Your ${tokenName} token will be verified on ${explorerName}!`;
  }

  async getTokenById(tokenId: string, userId: string): Promise<TokenMetadata | null> {
    try {
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          userId,
        },
      });

      if (!token) return null;

      return {
        ...token,
        features: token.features as any,
        deploymentData: token.deploymentData as any,
      } as TokenMetadata;
    } catch (error) {
      logger.error('Error fetching token:', error);
      throw error;
    }
  }

  async listTokens(userId: string): Promise<TokenMetadata[]> {
    try {
      const tokens = await prisma.token.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return tokens.map((token) => ({
        ...token,
        features: token.features as any,
        deploymentData: token.deploymentData as any,
      })) as TokenMetadata[];
    } catch (error) {
      logger.error('Error listing tokens:', error);
      throw error;
    }
  }

  async updateDeployment(tokenId: string, userId: string, txHash: string, contractAddress: string): Promise<void> {
    try {
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          userId,
        },
      });

      if (!token) {
        throw new Error('Token not found');
      }

      await prisma.token.update({
        where: {
          id: tokenId,
        },
        data: {
          txHash,
          contractAddress,
        },
      });

      await prisma.deploymentLog.create({
        data: {
          tokenId,
          txHash,
          status: 'deployed',
        },
      });

      logger.info(`Token ${tokenId} deployment updated with tx ${txHash}`);
    } catch (error) {
      logger.error('Error updating deployment:', error);
      throw error;
    }
  }

  async verifyToken(tokenId: string, userId: string): Promise<void> {
    try {
      const token = await prisma.token.findFirst({
        where: {
          id: tokenId,
          userId,
        },
      });

      if (!token) {
        throw new Error('Token not found');
      }

      if (!token.contractAddress) {
        throw new Error('Token not deployed yet');
      }

      await prisma.token.update({
        where: {
          id: tokenId,
        },
        data: {
          verified: true,
        },
      });

      await prisma.deploymentLog.create({
        data: {
          tokenId,
          status: 'verified',
        },
      });

      logger.info(`Token ${tokenId} marked as verified`);
    } catch (error) {
      logger.error('Error verifying token:', error);
      throw error;
    }
  }
}

export const tokenService = new TokenService();
