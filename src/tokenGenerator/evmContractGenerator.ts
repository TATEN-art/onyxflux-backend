import { TokenCreateInput, TokenFeatures } from './types';

export class EVMContractGenerator {
  generateContract(input: TokenCreateInput): string {
    const { name, symbol, totalSupply, decimals, features, destinationWallet } = input;

    const imports = this.generateImports(features);
    const inheritance = this.generateInheritance(features);
    const stateVariables = this.generateStateVariables(features);
    const constructor = this.generateConstructor(name, symbol, totalSupply, decimals, destinationWallet, features);
    const functions = this.generateFunctions(features);

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports}

contract ${this.sanitizeContractName(name)} is ${inheritance} {
${stateVariables}

${constructor}

${functions}
}`;
  }

  private sanitizeContractName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '');
  }

  private generateImports(features: TokenFeatures): string {
    const imports: string[] = [
      'import "@openzeppelin/contracts/token/ERC20/ERC20.sol";',
      'import "@openzeppelin/contracts/access/Ownable.sol";',
    ];

    if (features.mintable) {
      imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";');
    }

    if (features.burnable) {
      imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";');
    }

    if (features.antiBot || features.antiWhale) {
      imports.push('import "@openzeppelin/contracts/security/ReentrancyGuard.sol";');
    }

    return imports.join('\n');
  }

  private generateInheritance(features: TokenFeatures): string {
    const inheritance: string[] = ['ERC20', 'Ownable'];

    if (features.burnable) {
      inheritance.push('ERC20Burnable');
    }

    if (features.antiBot || features.antiWhale) {
      inheritance.push('ReentrancyGuard');
    }

    return inheritance.join(', ');
  }

  private generateStateVariables(features: TokenFeatures): string {
    const variables: string[] = [];

    if (features.liquidityTax > 0 || features.marketingTax > 0) {
      variables.push('    uint256 public liquidityFee = ' + (features.liquidityTax * 100).toString() + '; // ' + features.liquidityTax + '%');
      variables.push('    uint256 public marketingFee = ' + (features.marketingTax * 100).toString() + '; // ' + features.marketingTax + '%');
      variables.push('    address public marketingWallet;');
      variables.push('    address public liquidityWallet;');
      variables.push('    mapping(address => bool) public isExcludedFromFees;');
    }

    if (features.antiWhale) {
      variables.push('    uint256 public maxWalletAmount;');
      variables.push('    uint256 public maxTransactionAmount;');
    }

    if (features.antiBot) {
      variables.push('    mapping(address => uint256) private _lastTransferTimestamp;');
      variables.push('    mapping(address => bool) public isBlacklisted;');
      variables.push('    uint256 public transferCooldown = 30; // seconds');
      variables.push('    bool public tradingEnabled = false;');
    }

    if (features.liquidityTax > 0 || features.marketingTax > 0) {
      variables.push('    address public uniswapV2Pair;');
      variables.push('    address public uniswapV2Router;');
    }

    return variables.join('\n');
  }

  private generateConstructor(
    name: string,
    symbol: string,
    totalSupply: number,
    decimals: number,
    destinationWallet: string,
    features: TokenFeatures
  ): string {
    const supplyWithDecimals = totalSupply.toString() + ' * 10**' + decimals;

    let constructorBody = `    constructor() ERC20("${name}", "${symbol}") Ownable(msg.sender) {
        _mint(${destinationWallet}, ${supplyWithDecimals});`;

    if (features.liquidityTax > 0 || features.marketingTax > 0) {
      constructorBody += `
        marketingWallet = ${destinationWallet};
        liquidityWallet = ${destinationWallet};
        isExcludedFromFees[owner()] = true;
        isExcludedFromFees[address(this)] = true;
        isExcludedFromFees[${destinationWallet}] = true;`;
    }

    if (features.antiWhale) {
      constructorBody += `
        maxWalletAmount = (${supplyWithDecimals}) * 2 / 100; // 2% of total supply
        maxTransactionAmount = (${supplyWithDecimals}) * 1 / 100; // 1% of total supply`;
    }

    constructorBody += `
    }`;

    return constructorBody;
  }

  private generateFunctions(features: TokenFeatures): string {
    const functions: string[] = [];

    if (features.mintable) {
      functions.push(`    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }`);
    }

    if (features.antiBot) {
      functions.push(`    function enableTrading() external onlyOwner {
        tradingEnabled = true;
    }

    function setBlacklist(address account, bool value) external onlyOwner {
        isBlacklisted[account] = value;
    }

    function setTransferCooldown(uint256 cooldown) external onlyOwner {
        transferCooldown = cooldown;
    }`);
    }

    if (features.antiWhale) {
      functions.push(`    function setMaxWalletAmount(uint256 amount) external onlyOwner {
        maxWalletAmount = amount;
    }

    function setMaxTransactionAmount(uint256 amount) external onlyOwner {
        maxTransactionAmount = amount;
    }`);
    }

    if (features.liquidityTax > 0 || features.marketingTax > 0) {
      functions.push(`    function setFees(uint256 _liquidityFee, uint256 _marketingFee) external onlyOwner {
        liquidityFee = _liquidityFee;
        marketingFee = _marketingFee;
    }

    function setMarketingWallet(address wallet) external onlyOwner {
        marketingWallet = wallet;
    }

    function setLiquidityWallet(address wallet) external onlyOwner {
        liquidityWallet = wallet;
    }

    function excludeFromFees(address account, bool excluded) external onlyOwner {
        isExcludedFromFees[account] = excluded;
    }

    function setUniswapPair(address pair) external onlyOwner {
        uniswapV2Pair = pair;
    }`);
    }

    if (features.liquidityTax > 0 || features.marketingTax > 0 || features.antiWhale || features.antiBot) {
      functions.push(this.generateTransferOverride(features));
    }

    return functions.join('\n\n');
  }

  private generateTransferOverride(features: TokenFeatures): string {
    let transferFunction = `    function _update(address from, address to, uint256 amount) internal override {`;

    if (features.antiBot) {
      transferFunction += `
        require(!isBlacklisted[from] && !isBlacklisted[to], "Blacklisted address");
        
        if (from != owner() && to != owner()) {
            require(tradingEnabled, "Trading not enabled");
            
            if (_lastTransferTimestamp[from] != 0) {
                require(block.timestamp >= _lastTransferTimestamp[from] + transferCooldown, "Transfer cooldown active");
            }
            _lastTransferTimestamp[from] = block.timestamp;
        }`;
    }

    if (features.antiWhale) {
      transferFunction += `
        
        if (from != owner() && to != owner() && to != address(0) && to != address(0xdead)) {
            require(amount <= maxTransactionAmount, "Transfer amount exceeds max");
            
            if (to != uniswapV2Pair) {
                require(balanceOf(to) + amount <= maxWalletAmount, "Wallet amount exceeds max");
            }
        }`;
    }

    if (features.liquidityTax > 0 || features.marketingTax > 0) {
      transferFunction += `
        
        bool takeFee = !isExcludedFromFees[from] && !isExcludedFromFees[to];
        
        if (takeFee && (from == uniswapV2Pair || to == uniswapV2Pair)) {
            uint256 fees = 0;
            
            if (liquidityFee > 0) {
                uint256 liquidityAmount = (amount * liquidityFee) / 10000;
                fees += liquidityAmount;
                super._update(from, liquidityWallet, liquidityAmount);
            }
            
            if (marketingFee > 0) {
                uint256 marketingAmount = (amount * marketingFee) / 10000;
                fees += marketingAmount;
                super._update(from, marketingWallet, marketingAmount);
            }
            
            amount -= fees;
        }`;
    }

    transferFunction += `
        
        super._update(from, to, amount);
    }`;

    return transferFunction;
  }
}

export const evmContractGenerator = new EVMContractGenerator();
