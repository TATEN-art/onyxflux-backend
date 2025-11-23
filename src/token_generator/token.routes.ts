import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../utils/logger';
import { ERC20Generator, ERC20Config } from './erc20.generator';
import { ERC721Generator, ERC721Config } from './erc721.generator';
import { TokenAudit, TokenAuditRequest } from './token.audit';

const logger = new Logger('TokenRoutes');

export async function tokenRoutes(fastify: FastifyInstance) {
  const erc20Generator = new ERC20Generator();
  const erc721Generator = new ERC721Generator();
  const tokenAudit = new TokenAudit();
  
  /**
   * POST /api/token/generate
   * Generate ERC-20 or ERC-721 token contract
   */
  fastify.post('/api/token/generate', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { type: 'ERC20' | 'ERC721'; config: ERC20Config | ERC721Config };
      
      if (!body.type || !body.config) {
        return reply.code(400).send({
          error: 'Missing required fields: type, config',
        });
      }
      
      let result;
      
      if (body.type === 'ERC20') {
        result = erc20Generator.generateContract(body.config as ERC20Config);
      } else if (body.type === 'ERC721') {
        result = erc721Generator.generateContract(body.config as ERC721Config);
      } else {
        return reply.code(400).send({
          error: 'Invalid token type. Must be ERC20 or ERC721',
        });
      }
      
      logger.info(`Generated ${body.type} contract`);
      
      return reply.send({
        success: true,
        type: body.type,
        ...result,
      });
    } catch (error: any) {
      logger.error('Error generating token:', error);
      
      return reply.code(400).send({
        error: 'Failed to generate token',
        message: error.message,
      });
    }
  });
  
  /**
   * POST /api/token/deploy
   * Get deployment instructions (user deploys via their wallet)
   */
  fastify.post('/api/token/deploy', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as { 
        type: 'ERC20' | 'ERC721'; 
        contractCode: string;
        chain: string;
      };
      
      if (!body.type || !body.contractCode || !body.chain) {
        return reply.code(400).send({
          error: 'Missing required fields: type, contractCode, chain',
        });
      }
      
      const instructions = {
        steps: [
          '1. Copy the contract code to Remix IDE (remix.ethereum.org)',
          '2. Install required dependencies (@openzeppelin/contracts)',
          '3. Compile the contract with Solidity 0.8.20+',
          '4. Connect your wallet (MetaMask, WalletConnect, etc.)',
          `5. Select network: ${body.chain}`,
          '6. Deploy the contract',
          '7. Verify the contract on block explorer',
          '8. Follow post-deployment steps from generation output',
        ],
        remixUrl: 'https://remix.ethereum.org',
        hardhatSetup: [
          'npm install --save-dev hardhat @openzeppelin/contracts',
          'npx hardhat compile',
          'npx hardhat run scripts/deploy.js --network ' + body.chain.toLowerCase(),
        ],
        note: 'OnyxFlux does not deploy contracts directly. You maintain full control by deploying from your own wallet.',
      };
      
      return reply.send({
        success: true,
        instructions,
      });
    } catch (error: any) {
      logger.error('Error getting deployment instructions:', error);
      
      return reply.code(500).send({
        error: 'Failed to get deployment instructions',
        message: error.message,
      });
    }
  });
  
  /**
   * POST /api/token/audit
   * Audit a token contract for security risks
   */
  fastify.post('/api/token/audit', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as TokenAuditRequest;
      
      if (!body.contractAddress || !body.chain) {
        return reply.code(400).send({
          error: 'Missing required fields: contractAddress, chain',
        });
      }
      
      const auditReport = await tokenAudit.auditToken(body);
      
      logger.info(`Audited token ${body.contractAddress} - Score: ${auditReport.overallScore}`);
      
      return reply.send({
        success: true,
        audit: auditReport,
      });
    } catch (error: any) {
      logger.error('Error auditing token:', error);
      
      return reply.code(500).send({
        error: 'Failed to audit token',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/token/audit/quick/:chain/:address
   * Quick audit for a token
   */
  fastify.get('/api/token/audit/quick/:chain/:address', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { chain, address } = request.params as { chain: string; address: string };
      
      const quickAudit = await tokenAudit.quickAudit(address, chain);
      
      return reply.send({
        success: true,
        ...quickAudit,
      });
    } catch (error: any) {
      logger.error('Error performing quick audit:', error);
      
      return reply.code(500).send({
        error: 'Failed to perform quick audit',
        message: error.message,
      });
    }
  });
  
  /**
   * GET /api/token/templates
   * Get recommended token templates
   */
  fastify.get('/api/token/templates', {
    preHandler: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const templates = {
        erc20: {
          safe: ERC20Generator.getRecommendedSafeSettings(),
          standard: {
            decimals: 18,
            buyTax: 0,
            sellTax: 0,
            mintable: false,
            burnable: true,
            pausable: false,
            renounceOwnership: true,
          },
          deflationary: {
            decimals: 18,
            transferTax: 2,
            burnable: true,
            mintable: false,
            renounceOwnership: true,
          },
        },
        erc721: {
          safe: ERC721Generator.getRecommendedSafeSettings(),
          standard: {
            maxMintPerWallet: 10,
            royaltyPercent: 5,
            revealEnabled: false,
            burnable: true,
            pausable: false,
          },
          premium: {
            maxMintPerWallet: 5,
            royaltyPercent: 7.5,
            revealEnabled: true,
            burnable: true,
            pausable: false,
            enumerable: true,
          },
        },
      };
      
      return reply.send({
        success: true,
        templates,
      });
    } catch (error: any) {
      logger.error('Error fetching templates:', error);
      
      return reply.code(500).send({
        error: 'Failed to fetch templates',
        message: error.message,
      });
    }
  });
  
  logger.info('Token generator routes registered');
}
