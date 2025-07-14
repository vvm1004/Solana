use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::state::Pool;
use crate::errors::AppError;
use crate::utils::mul_div_u64;

pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, amount: u64) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let pool_a = &ctx.accounts.pool_account_a;
    let pool_b = &ctx.accounts.pool_account_b;
    let lp_supply = ctx.accounts.mint_liquidity.supply;

    require!(lp_supply > 0, AppError::CalculationError);
    require!(amount > 0, AppError::DepositTooSmall);

    // Tính lượng token A và B tương ứng
    let amount_a = mul_div_u64(pool_a.amount, amount, lp_supply)?;
    let amount_b = mul_div_u64(pool_b.amount, amount, lp_supply)?;

    let authority_bump = ctx.bumps.pool_authority;
    let authority_seeds = &[
        &pool.amm.to_bytes(),
        &pool.mint_a.to_bytes(),
        &pool.mint_b.to_bytes(),
        b"authority".as_ref(),
        &[authority_bump],
    ];

    let signer_seeds = &[&authority_seeds[..]];

    // Chuyển token A về cho LP
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_account_a.to_account_info(),
                to: ctx.accounts.depositor_account_a.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount_a,
    )?;

    // Chuyển token B về cho LP
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_account_b.to_account_info(),
                to: ctx.accounts.depositor_account_b.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount_b,
    )?;

    // Burn LP token
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.mint_liquidity.to_account_info(),
                from: ctx.accounts.depositor_account_liquidity.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [pool.amm.key().as_ref(), pool.mint_a.key().as_ref(), pool.mint_b.key().as_ref()],
        bump,
        has_one = mint_a,
        has_one = mint_b
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: Safe via PDA
    #[account(
        seeds = [
            pool.amm.key().as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            b"authority"
        ],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,

    pub mint_a: Box<Account<'info, Mint>>,
    pub mint_b: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [
            pool.amm.key().as_ref(),
            mint_a.key().as_ref(),
            mint_b.key().as_ref(),
            b"mint_liquidity"
        ],
        bump,
    )]
    pub mint_liquidity: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub pool_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_account_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub depositor_account_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor_account_liquidity: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
