use crate::constants::REWARD_VAULT_SEED;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = admin,
        seeds = [REWARD_VAULT_SEED, mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = reward_vault,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
    Ok(())
}
