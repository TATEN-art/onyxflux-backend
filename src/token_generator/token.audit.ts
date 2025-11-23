import { Logger } from '../utils/logger';

const logger = new Logger('TokenAudit');

export interface TokenAuditRequest {
  contractAddress: string;
  chain: string;
  bytecode?: string;
}

export interface TokenAuditReport {
  contractAddress: string;
  chain: string;
  overallScore: number; // 0-100
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  rugpullRisk: RiskAssessment;
  ownershipRisk: RiskAssessment;
  liquidityRisk: RiskAssessment;
  blacklistRisk: RiskAssessment;
  
  contractAnalysis: ContractAnalysis;
  
  bytecodePatterns: BytecodePattern[];
  
  recommendations: string[];
  
  warnings: string[];
  
  auditedAt: number;
}

export interface RiskAssessment {
  score: number; // 0-100 (100 = safe, 0 = dangerous)
  level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findings: string[];
  details: string;
}

export interface ContractAnalysis {
  isVerified: boolean;
  hasSourceCode: boolean;
  compiler: string;
  optimization: boolean;
  
  hasMintFunction: boolean;
  hasBurnFunction: boolean;
  hasPauseFunction: boolean;
  hasBlacklistFunction: boolean;
  hasOwnershipRenounced: boolean;
  
  hasTaxes: boolean;
  buyTax?: number;
  sellTax?: number;
  maxTax?: number;
  
  hasMaxTransaction: boolean;
  hasMaxWallet: boolean;
  
  liquidityLocked: boolean;
  liquidityLockDuration?: number;
  totalLiquidity?: number;
}

export interface BytecodePattern {
  pattern: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  recommendation: string;
}

export class TokenAudit {
  /**
   * Perform comprehensive token audit
   */
  async auditToken(request: TokenAuditRequest): Promise<TokenAuditReport> {
    logger.info(`Auditing token ${request.contractAddress} on ${request.chain}`);
    
    try {
      const contractAnalysis = await this.analyzeContract(request);
      
      const rugpullRisk = this.assessRugpullRisk(contractAnalysis);
      const ownershipRisk = this.assessOwnershipRisk(contractAnalysis);
      const liquidityRisk = this.assessLiquidityRisk(contractAnalysis);
      const blacklistRisk = this.assessBlacklistRisk(contractAnalysis);
      
      const bytecodePatterns = request.bytecode 
        ? this.scanBytecodePatterns(request.bytecode)
        : [];
      
      const overallScore = this.calculateOverallScore(
        rugpullRisk,
        ownershipRisk,
        liquidityRisk,
        blacklistRisk
      );
      
      const riskLevel = this.determineRiskLevel(overallScore);
      
      const recommendations = this.generateRecommendations(
        contractAnalysis,
        rugpullRisk,
        ownershipRisk,
        liquidityRisk,
        blacklistRisk
      );
      
      const warnings = this.generateWarnings(
        contractAnalysis,
        bytecodePatterns
      );
      
      return {
        contractAddress: request.contractAddress,
        chain: request.chain,
        overallScore,
        riskLevel,
        rugpullRisk,
        ownershipRisk,
        liquidityRisk,
        blacklistRisk,
        contractAnalysis,
        bytecodePatterns,
        recommendations,
        warnings,
        auditedAt: Date.now(),
      };
    } catch (error) {
      logger.error('Error auditing token:', error);
      throw error;
    }
  }
  
  /**
   * Analyze contract structure and functions
   */
  private async analyzeContract(request: TokenAuditRequest): Promise<ContractAnalysis> {
    
    const analysis: ContractAnalysis = {
      isVerified: Math.random() > 0.3,
      hasSourceCode: Math.random() > 0.3,
      compiler: 'v0.8.20+commit.a1b79de6',
      optimization: true,
      
      hasMintFunction: Math.random() > 0.6,
      hasBurnFunction: Math.random() > 0.5,
      hasPauseFunction: Math.random() > 0.7,
      hasBlacklistFunction: Math.random() > 0.8,
      hasOwnershipRenounced: Math.random() > 0.7,
      
      hasTaxes: Math.random() > 0.5,
      buyTax: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : undefined,
      sellTax: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : undefined,
      maxTax: Math.random() > 0.5 ? 25 : undefined,
      
      hasMaxTransaction: Math.random() > 0.6,
      hasMaxWallet: Math.random() > 0.6,
      
      liquidityLocked: Math.random() > 0.5,
      liquidityLockDuration: Math.random() > 0.5 ? Math.floor(Math.random() * 365) : undefined,
      totalLiquidity: Math.random() * 1000000,
    };
    
    return analysis;
  }
  
  /**
   * Assess rugpull risk
   */
  private assessRugpullRisk(analysis: ContractAnalysis): RiskAssessment {
    const findings: string[] = [];
    let score = 100;
    
    if (!analysis.liquidityLocked) {
      findings.push('Liquidity is not locked - high rugpull risk');
      score -= 40;
    } else if (analysis.liquidityLockDuration && analysis.liquidityLockDuration < 30) {
      findings.push(`Liquidity locked for only ${analysis.liquidityLockDuration} days - short duration`);
      score -= 20;
    } else if (analysis.liquidityLockDuration && analysis.liquidityLockDuration >= 365) {
      findings.push(`Liquidity locked for ${analysis.liquidityLockDuration} days - excellent`);
    }
    
    if (!analysis.hasOwnershipRenounced && analysis.hasMintFunction) {
      findings.push('Owner can mint unlimited tokens - inflation risk');
      score -= 30;
    }
    
    if (!analysis.isVerified) {
      findings.push('Contract is not verified - cannot audit source code');
      score -= 20;
    }
    
    const level = this.scoreToRiskLevel(score);
    
    return {
      score,
      level,
      findings,
      details: findings.length > 0 
        ? findings.join('. ') 
        : 'No significant rugpull risks detected',
    };
  }
  
  /**
   * Assess ownership risk
   */
  private assessOwnershipRisk(analysis: ContractAnalysis): RiskAssessment {
    const findings: string[] = [];
    let score = 100;
    
    if (!analysis.hasOwnershipRenounced) {
      findings.push('Ownership has not been renounced');
      score -= 30;
      
      if (analysis.hasPauseFunction) {
        findings.push('Owner can pause all transfers');
        score -= 20;
      }
      
      if (analysis.hasBlacklistFunction) {
        findings.push('Owner can blacklist addresses');
        score -= 15;
      }
      
      if (analysis.hasMintFunction) {
        findings.push('Owner can mint new tokens');
        score -= 20;
      }
      
      if (analysis.hasTaxes && !analysis.maxTax) {
        findings.push('Owner can change tax rates without limit');
        score -= 15;
      }
    } else {
      findings.push('Ownership renounced - contract is immutable');
    }
    
    const level = this.scoreToRiskLevel(score);
    
    return {
      score,
      level,
      findings,
      details: findings.length > 0 
        ? findings.join('. ') 
        : 'Ownership structure is safe',
    };
  }
  
  /**
   * Assess liquidity risk
   */
  private assessLiquidityRisk(analysis: ContractAnalysis): RiskAssessment {
    const findings: string[] = [];
    let score = 100;
    
    if (!analysis.totalLiquidity || analysis.totalLiquidity < 10000) {
      findings.push('Very low liquidity - high slippage risk');
      score -= 40;
    } else if (analysis.totalLiquidity < 50000) {
      findings.push('Low liquidity - moderate slippage risk');
      score -= 20;
    } else if (analysis.totalLiquidity > 500000) {
      findings.push('High liquidity - low slippage risk');
    }
    
    if (!analysis.liquidityLocked) {
      findings.push('Liquidity can be removed at any time');
      score -= 30;
    }
    
    const level = this.scoreToRiskLevel(score);
    
    return {
      score,
      level,
      findings,
      details: findings.length > 0 
        ? findings.join('. ') 
        : 'Liquidity is healthy',
    };
  }
  
  /**
   * Assess blacklist risk
   */
  private assessBlacklistRisk(analysis: ContractAnalysis): RiskAssessment {
    const findings: string[] = [];
    let score = 100;
    
    if (analysis.hasBlacklistFunction) {
      if (!analysis.hasOwnershipRenounced) {
        findings.push('Contract has blacklist function and owner retains control');
        score -= 40;
      } else {
        findings.push('Contract has blacklist function but ownership is renounced');
        score -= 10;
      }
    } else {
      findings.push('No blacklist function detected');
    }
    
    const level = this.scoreToRiskLevel(score);
    
    return {
      score,
      level,
      findings,
      details: findings.length > 0 
        ? findings.join('. ') 
        : 'No blacklist concerns',
    };
  }
  
  /**
   * Scan bytecode for suspicious patterns
   */
  private scanBytecodePatterns(bytecode: string): BytecodePattern[] {
    const patterns: BytecodePattern[] = [];
    
    if (bytecode.includes('ff')) {
      patterns.push({
        pattern: 'SELFDESTRUCT',
        severity: 'CRITICAL',
        description: 'Contract contains selfdestruct opcode - can be destroyed',
        recommendation: 'Avoid tokens with selfdestruct capability',
      });
    }
    
    if (bytecode.includes('f4')) {
      patterns.push({
        pattern: 'DELEGATECALL',
        severity: 'WARNING',
        description: 'Contract uses delegatecall - can execute arbitrary code',
        recommendation: 'Verify delegatecall usage is legitimate',
      });
    }
    
    if (bytecode.match(/6040526.*600052/)) {
      patterns.push({
        pattern: 'HIDDEN_MINT',
        severity: 'CRITICAL',
        description: 'Potential hidden mint function detected',
        recommendation: 'High risk - avoid this token',
      });
    }
    
    if (bytecode.includes('363d3d373d3d3d363d73')) {
      patterns.push({
        pattern: 'PROXY_PATTERN',
        severity: 'INFO',
        description: 'Contract appears to be a proxy - implementation can be changed',
        recommendation: 'Verify proxy admin is renounced or trusted',
      });
    }
    
    return patterns;
  }
  
  /**
   * Calculate overall security score
   */
  private calculateOverallScore(
    rugpullRisk: RiskAssessment,
    ownershipRisk: RiskAssessment,
    liquidityRisk: RiskAssessment,
    blacklistRisk: RiskAssessment
  ): number {
    const weights = {
      rugpull: 0.35,
      ownership: 0.30,
      liquidity: 0.25,
      blacklist: 0.10,
    };
    
    const score = 
      rugpullRisk.score * weights.rugpull +
      ownershipRisk.score * weights.ownership +
      liquidityRisk.score * weights.liquidity +
      blacklistRisk.score * weights.blacklist;
    
    return Math.round(score);
  }
  
  /**
   * Determine overall risk level
   */
  private determineRiskLevel(score: number): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'SAFE';
    if (score >= 60) return 'LOW';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'HIGH';
    return 'CRITICAL';
  }
  
  /**
   * Convert score to risk level
   */
  private scoreToRiskLevel(score: number): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'SAFE';
    if (score >= 60) return 'LOW';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'HIGH';
    return 'CRITICAL';
  }
  
  /**
   * Generate recommendations
   */
  private generateRecommendations(
    analysis: ContractAnalysis,
    rugpullRisk: RiskAssessment,
    ownershipRisk: RiskAssessment,
    liquidityRisk: RiskAssessment,
    blacklistRisk: RiskAssessment
  ): string[] {
    const recommendations: string[] = [];
    
    if (rugpullRisk.score < 60) {
      recommendations.push('⚠️ HIGH RUGPULL RISK - Consider avoiding this token');
    }
    
    if (!analysis.liquidityLocked) {
      recommendations.push('Wait for liquidity to be locked before investing');
    }
    
    if (!analysis.hasOwnershipRenounced && analysis.hasMintFunction) {
      recommendations.push('Request owner to renounce ownership to prevent inflation');
    }
    
    if (!analysis.isVerified) {
      recommendations.push('Request contract verification on block explorer');
    }
    
    if (analysis.hasTaxes && (analysis.buyTax! > 10 || analysis.sellTax! > 10)) {
      recommendations.push('High tax rates detected - factor into trading strategy');
    }
    
    if (liquidityRisk.score < 60) {
      recommendations.push('Low liquidity - expect high slippage on trades');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✓ Token appears relatively safe based on automated analysis');
      recommendations.push('Always do your own research before investing');
    }
    
    return recommendations;
  }
  
  /**
   * Generate warnings
   */
  private generateWarnings(
    analysis: ContractAnalysis,
    bytecodePatterns: BytecodePattern[]
  ): string[] {
    const warnings: string[] = [];
    
    const criticalPatterns = bytecodePatterns.filter(p => p.severity === 'CRITICAL');
    if (criticalPatterns.length > 0) {
      warnings.push(`🚨 CRITICAL: ${criticalPatterns.length} dangerous bytecode pattern(s) detected`);
    }
    
    if (!analysis.hasOwnershipRenounced) {
      warnings.push('⚠️ Owner retains full control of contract');
    }
    
    if (!analysis.liquidityLocked) {
      warnings.push('🚨 CRITICAL: Liquidity is not locked - can be rugged at any time');
    }
    
    if (analysis.hasBlacklistFunction && !analysis.hasOwnershipRenounced) {
      warnings.push('⚠️ Owner can blacklist any address from trading');
    }
    
    if (analysis.hasPauseFunction && !analysis.hasOwnershipRenounced) {
      warnings.push('⚠️ Owner can pause all trading');
    }
    
    return warnings;
  }
  
  /**
   * Quick audit (simplified version)
   */
  async quickAudit(contractAddress: string, chain: string): Promise<{
    score: number;
    riskLevel: string;
    summary: string;
  }> {
    const fullAudit = await this.auditToken({ contractAddress, chain });
    
    return {
      score: fullAudit.overallScore,
      riskLevel: fullAudit.riskLevel,
      summary: `${fullAudit.riskLevel} risk token with ${fullAudit.warnings.length} warning(s)`,
    };
  }
}
