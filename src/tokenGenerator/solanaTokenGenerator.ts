import { TokenCreateInput } from './types';

export class SolanaTokenGenerator {
  generateTokenInstructions(input: TokenCreateInput): any {
    const { name, symbol, totalSupply, decimals, features, destinationWallet } = input;

    const instructions = {
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      instructions: [
        {
          type: 'createMint',
          decimals,
          mintAuthority: destinationWallet,
          freezeAuthority: features.burnable ? destinationWallet : null,
        },
        {
          type: 'createAssociatedTokenAccount',
          owner: destinationWallet,
        },
        {
          type: 'mintTo',
          amount: totalSupply * Math.pow(10, decimals),
          destination: destinationWallet,
        },
      ],
      metadata: {
        name,
        symbol,
        uri: '', // Will be populated with logo metadata
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
    };

    if (!features.mintable) {
      instructions.instructions.push({
        type: 'setAuthority',
        authorityType: 'MintTokens',
        newAuthority: null,
      });
    }

    return instructions;
  }

  generateAnchorProgram(input: TokenCreateInput): string {
    const { name, symbol, features } = input;

    return `use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};

declare_id!("${this.generateProgramId()}");

#[program]
pub mod ${this.sanitizeProgramName(name)} {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
        name: String,
        symbol: String,
    ) -> Result<()> {
        let mint = &mut ctx.accounts.mint;
        mint.decimals = decimals;
        Ok(())
    }

    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        ${features.mintable ? `
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, amount)?;
        Ok(())
        ` : `
        err!(ErrorCode::MintingDisabled)
        `}
    }

    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        ${features.burnable ? `
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, amount)?;
        Ok(())
        ` : `
        err!(ErrorCode::BurningDisabled)
        `}
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, mint::decimals = 9, mint::authority = authority)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Minting is disabled for this token")]
    MintingDisabled,
    #[msg("Burning is disabled for this token")]
    BurningDisabled,
}`;
  }

  private sanitizeProgramName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  private generateProgramId(): string {
    return '11111111111111111111111111111111';
  }

  generateDeploymentInstructions(input: TokenCreateInput): string {
    return `# Solana SPL Token Deployment Instructions

## Prerequisites
- Solana CLI installed: https://docs.solana.com/cli/install-solana-cli-tools
- Anchor framework installed: https://www.anchor-lang.com/docs/installation
- Phantom or Solflare wallet with SOL for deployment

## Step 1: Set up Solana CLI
\`\`\`bash
solana config set --url mainnet-beta
solana config set --keypair ~/.config/solana/id.json
\`\`\`

## Step 2: Create Token Mint
\`\`\`bash
spl-token create-token --decimals ${input.decimals}
\`\`\`

Save the mint address that is returned.

## Step 3: Create Token Account
\`\`\`bash
spl-token create-account <MINT_ADDRESS>
\`\`\`

## Step 4: Mint Initial Supply
\`\`\`bash
spl-token mint <MINT_ADDRESS> ${input.totalSupply}
\`\`\`

## Step 5: Upload Metadata
Use Metaplex to upload token metadata:
\`\`\`bash
metaplex upload-metadata \\
  --name "${input.name}" \\
  --symbol "${input.symbol}" \\
  --uri <METADATA_URI>
\`\`\`

## Step 6: Disable Minting (if not mintable)
${!input.features.mintable ? `\`\`\`bash
spl-token authorize <MINT_ADDRESS> mint --disable
\`\`\`` : 'Skip this step - minting is enabled'}

## Step 7: Verify on Solscan
Visit: https://solscan.io/token/<MINT_ADDRESS>

Your token is now deployed on Solana!`;
  }
}

export const solanaTokenGenerator = new SolanaTokenGenerator();
