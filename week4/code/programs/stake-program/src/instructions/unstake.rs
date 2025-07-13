use crate::constants::{REWARD_VAULT_SEED, STAKE_INFO_SEED};
use crate::errors::AppError;
use crate::state::StakeInfo;
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [STAKE_INFO_SEED, staker.key().as_ref(), mint.key().as_ref()],
        bump,
        has_one = staker,
        has_one = mint,
        close = staker,
    )]
    pub stake_info: Account<'info, StakeInfo>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = stake_info,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [REWARD_VAULT_SEED, mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = reward_vault,
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = staker,
    )]
    pub staker_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn unstake(ctx: Context<Unstake>, unstake_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let stake_info = &mut ctx.accounts.stake_info;

    if !stake_info.is_staked || stake_info.amount == 0 {
        return Err(AppError::NotStaked.into());
    }

    if unstake_amount == 0 || unstake_amount > stake_info.amount {
        return Err(AppError::NoToken.into());
    }

    // Tính phần thưởng: 1% mỗi block
    let blocks = clock.slot - stake_info.stake_at;
    let reward = unstake_amount
        .checked_mul(blocks)
        .unwrap()
        .checked_div(100)
        .unwrap();

    // Tạo seeds cho reward signer
    let mint_key = ctx.accounts.mint.key();
    let reward_vault_bump = ctx.bumps.reward_vault;
    let reward_seeds: &[&[u8]] = &[
        REWARD_VAULT_SEED,
        mint_key.as_ref(),
        &[reward_vault_bump],
    ];
    let reward_signer: &[&[&[u8]]] = &[reward_seeds];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.staker_token_account.to_account_info(),
                authority: ctx.accounts.reward_vault.to_account_info(),
            },
            reward_signer,
        ),
        reward,
    )?;

    // Tạo seeds cho stake signer
    let staker_key = ctx.accounts.staker.key();
    let stake_info_bump = ctx.bumps.stake_info;
    let stake_seeds: &[&[u8]] = &[
        STAKE_INFO_SEED,
        staker_key.as_ref(),
        mint_key.as_ref(),
        &[stake_info_bump],
    ];
    let stake_signer: &[&[&[u8]]] = &[stake_seeds];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.staker_token_account.to_account_info(),
                authority: stake_info.to_account_info(), 
            },
            stake_signer,
        ),
        unstake_amount,
    )?;

    // Cập nhật trạng thái
    stake_info.amount -= unstake_amount;
    if stake_info.amount == 0 {
        stake_info.is_staked = false;
    } else {
        stake_info.stake_at = clock.slot;
    }

    Ok(())
}
