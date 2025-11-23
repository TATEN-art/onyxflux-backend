import { Logger } from '../../utils/logger';

const logger = new Logger('NovaChatService');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  isCryptoRelated: boolean;
}

export class NovaChatService {
  /**
   * Process chat message and return Nova's response
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const { message, conversationHistory = [] } = request;
      
      const isCryptoRelated = this.isCryptoRelated(message);
      
      if (!isCryptoRelated) {
        return {
          response: "Sorry, I can only answer crypto-related questions. Please ask me about cryptocurrencies, blockchain, trading, DeFi, NFTs, or Web3 topics.",
          isCryptoRelated: false,
        };
      }
      
      const response = await this.generateResponse(message, conversationHistory);
      
      return {
        response,
        isCryptoRelated: true,
      };
    } catch (error) {
      logger.error('Error processing chat message:', error);
      throw error;
    }
  }
  
  /**
   * Check if message is crypto-related
   */
  private isCryptoRelated(message: string): boolean {
    const cryptoKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency', 'altcoin',
      'token', 'coin', 'solana', 'sol', 'cardano', 'ada', 'polygon', 'matic',
      'binance', 'bnb', 'ripple', 'xrp', 'dogecoin', 'doge', 'shiba', 'usdt',
      'usdc', 'stablecoin', 'memecoin',
      
      'blockchain', 'block', 'chain', 'ledger', 'distributed', 'decentralized',
      'consensus', 'mining', 'miner', 'hash', 'node', 'validator', 'staking',
      'proof of work', 'pow', 'proof of stake', 'pos',
      
      'trading', 'trade', 'buy', 'sell', 'exchange', 'dex', 'cex', 'swap',
      'liquidity', 'pool', 'amm', 'order book', 'market', 'limit order',
      'stop loss', 'take profit', 'leverage', 'margin', 'futures', 'options',
      'long', 'short', 'bull', 'bear', 'pump', 'dump', 'whale', 'volume',
      'price', 'chart', 'candle', 'technical analysis', 'ta', 'indicator',
      'rsi', 'macd', 'bollinger', 'moving average', 'support', 'resistance',
      
      'defi', 'decentralized finance', 'yield', 'farming', 'lending', 'borrowing',
      'collateral', 'liquidation', 'apy', 'apr', 'tvl', 'protocol', 'dapp',
      'smart contract', 'gas', 'gwei', 'transaction', 'tx', 'wallet',
      'metamask', 'trust wallet', 'ledger', 'hardware wallet',
      
      'nft', 'non-fungible', 'opensea', 'marketplace', 'collection', 'mint',
      'minting', 'erc721', 'erc1155', 'metadata', 'ipfs', 'royalty',
      
      'web3', 'dao', 'governance', 'voting', 'proposal', 'treasury',
      'multisig', 'bridge', 'cross-chain', 'layer 2', 'l2', 'rollup',
      'sidechain', 'scaling', 'evm', 'solidity', 'rust',
      
      'rugpull', 'rug pull', 'scam', 'hack', 'exploit', 'vulnerability',
      'audit', 'security', 'private key', 'seed phrase', 'recovery',
      
      'market cap', 'mcap', 'circulation', 'supply', 'tokenomics',
      'inflation', 'deflation', 'burn', 'burning', 'halving',
    ];
    
    const lowerMessage = message.toLowerCase();
    
    return cryptoKeywords.some(keyword => lowerMessage.includes(keyword));
  }
  
  /**
   * Generate Nova's response
   */
  private async generateResponse(message: string, conversationHistory: ChatMessage[]): Promise<string> {
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('worth')) {
      return "I can help you analyze price movements and trends! To get real-time price data and predictions, please use the Nova Intelligence features in the dashboard. I can explain how to interpret price charts, identify support and resistance levels, and understand market indicators like RSI, MACD, and Bollinger Bands.";
    }
    
    if (lowerMessage.includes('strategy') || lowerMessage.includes('how to trade') || lowerMessage.includes('when to buy')) {
      return "Trading strategies depend on your risk tolerance and time horizon. I recommend:\n\n1. **Scalping**: Quick trades (minutes to hours) for small profits\n2. **Day Trading**: Open and close positions within the same day\n3. **Swing Trading**: Hold positions for days to weeks\n4. **HODLing**: Long-term holding strategy\n\nUse the Bot Builder to create automated signal generators based on Nova's predictions. Always use stop losses and never invest more than you can afford to lose.";
    }
    
    if (lowerMessage.includes('defi') || lowerMessage.includes('yield') || lowerMessage.includes('staking')) {
      return "DeFi (Decentralized Finance) offers various ways to earn yield:\n\n1. **Staking**: Lock tokens to secure the network and earn rewards\n2. **Liquidity Providing**: Supply tokens to DEX pools and earn trading fees\n3. **Lending**: Lend your crypto to borrowers and earn interest\n4. **Yield Farming**: Optimize returns across multiple protocols\n\nAlways research the protocol's security, audit history, and smart contract risks before depositing funds.";
    }
    
    if (lowerMessage.includes('nft') || lowerMessage.includes('non-fungible')) {
      return "NFTs (Non-Fungible Tokens) are unique digital assets on the blockchain. Use the Token Generator to create your own NFT collection with:\n\n- Custom metadata and artwork\n- Royalty settings (ERC2981)\n- Reveal mechanics\n- Minting controls\n\nBefore minting or buying NFTs, always verify the contract address, check the project's roadmap, and assess the community engagement.";
    }
    
    if (lowerMessage.includes('safe') || lowerMessage.includes('secure') || lowerMessage.includes('scam') || lowerMessage.includes('rugpull')) {
      return "Security is paramount in crypto! Here are key safety practices:\n\n1. **Never share your private keys or seed phrase**\n2. **Use hardware wallets for large amounts**\n3. **Verify contract addresses before transactions**\n4. **Check token audits using the Token Audit feature**\n5. **Be wary of promises of guaranteed returns**\n6. **Watch for rugpull warning signs**: unlocked liquidity, anonymous team, no audit\n\nUse Nova's manipulation detection to identify suspicious trading patterns.";
    }
    
    if (lowerMessage.includes('whale') || lowerMessage.includes('large holder')) {
      return "Whale activity can significantly impact prices. Nova tracks:\n\n- **Small Whales**: $250k+ transactions\n- **Medium Whales**: $500k+ transactions\n- **Mega Whales**: $1M+ transactions\n- **Institutional Whales**: $5M+ transactions\n\nWatch for whale accumulation (bullish) or distribution (bearish) patterns. Enable whale alerts in your dashboard to get notified of significant movements.";
    }
    
    if (lowerMessage.includes('technical') || lowerMessage.includes('indicator') || lowerMessage.includes('rsi') || lowerMessage.includes('macd')) {
      return "Technical analysis helps identify trends and entry/exit points. Key indicators:\n\n**RSI (Relative Strength Index)**:\n- Above 70: Overbought (potential sell signal)\n- Below 30: Oversold (potential buy signal)\n\n**MACD (Moving Average Convergence Divergence)**:\n- Bullish crossover: MACD line crosses above signal line\n- Bearish crossover: MACD line crosses below signal line\n\n**Bollinger Bands**:\n- Price touching upper band: Overbought\n- Price touching lower band: Oversold\n\nUse Nova's market display to view all these indicators in real-time.";
    }
    
    if (lowerMessage.includes('backtest') || lowerMessage.includes('test strategy')) {
      return "Backtesting helps validate trading strategies using historical data. Use the Backtesting Engine to:\n\n1. Test different strategies (Breakout, Scalper, Swing, etc.)\n2. Analyze win rate, ROI, and Sharpe ratio\n3. Compare multiple strategies side-by-side\n4. Optimize entry/exit parameters\n5. Assess risk with max drawdown analysis\n\nRemember: past performance doesn't guarantee future results, but it helps identify robust strategies.";
    }
    
    if (lowerMessage.includes('what is') || lowerMessage.includes('explain') || lowerMessage.includes('how does')) {
      return "I'm here to help you understand crypto concepts! Could you be more specific about what you'd like to learn? I can explain:\n\n- Blockchain technology and consensus mechanisms\n- Different types of cryptocurrencies and tokens\n- Trading strategies and risk management\n- DeFi protocols and yield farming\n- NFTs and digital collectibles\n- Smart contracts and dApps\n- Security best practices\n\nJust ask your question, and I'll provide a detailed explanation!";
    }
    
    return "That's an interesting crypto question! While I can provide general guidance, I recommend using Nova's advanced features for:\n\n- **Real-time predictions**: Multi-timeframe price forecasts\n- **Whale tracking**: Monitor large holder movements\n- **Manipulation detection**: Identify suspicious patterns\n- **Bot Builder**: Create automated signal generators\n- **Backtesting**: Test strategies with historical data\n\nIs there a specific aspect of crypto trading or blockchain technology you'd like me to explain in more detail?";
  }
}
