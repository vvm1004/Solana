// src/instructions/deposit_liquidity.rs
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount, Transfer},
};

use crate::state::Pool;
use crate::errors::AppError;
use crate::utils::{integer_sqrt, mul_div_u64};

pub fn deposit_liquidity(
    ctx: Context<DepositLiquidity>,
    amount_a_desired: u64,
    amount_b_desired: u64,
) -> Result<()> {
    let mut amount_a = if amount_a_desired > ctx.accounts.depositor_account_a.amount {
        ctx.accounts.depositor_account_a.amount
    } else {
        amount_a_desired
    };

    let mut amount_b = if amount_b_desired > ctx.accounts.depositor_account_b.amount {
        ctx.accounts.depositor_account_b.amount
    } else {
        amount_b_desired
    };

    let pool_a = &ctx.accounts.pool_account_a;
    let pool_b = &ctx.accounts.pool_account_b;

    let is_deposited = pool_a.amount != 0 || pool_b.amount != 0;

    (amount_a, amount_b) = if !is_deposited {
        (amount_a, amount_b)
    } else {
        // dx = X * dy / Y, dy = Y * dx / X
        let ideal_amount_a = mul_div_u64(pool_a.amount, amount_b, pool_b.amount)?;

        if amount_a >= ideal_amount_a {
            (ideal_amount_a, amount_b)
        } else {
            let ideal_amount_b = mul_div_u64(pool_b.amount, amount_a, pool_a.amount)?;
            (amount_a, ideal_amount_b)
        }
    };

    // transfer token A from LP to pool A
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.depositor_account_a.to_account_info(),
                to: ctx.accounts.pool_account_a.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount_a,
    )?;

    // transfer token B from LP to pool B
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.depositor_account_b.to_account_info(),
                to: ctx.accounts.pool_account_b.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount_b,
    )?;

    // Mint LP token to LProvider
    let lp_supply = ctx.accounts.mint_liquidity.supply;

    let liquidity = if lp_supply == 0 {
        // For initial liquidity: sqrt(amount_a * amount_b)
        let product = (amount_a as u128)
            .checked_mul(amount_b as u128)
            .ok_or(AppError::CalculationError)?;
        
        integer_sqrt(product)
    } else {
        // For subsequent liquidity: amount_a * lp_supply / pool_a_amount
        mul_div_u64(amount_a, lp_supply, pool_a.amount)?
    };

    let authority_bump = ctx.bumps.pool_authority;

    let authority_seeds = &[
        &ctx.accounts.pool.amm.to_bytes(),
        &ctx.accounts.pool.mint_a.to_bytes(),
        &ctx.accounts.pool.mint_b.to_bytes(),
        b"authority".as_ref(),
        &[authority_bump],
    ];

    let signer_seeds = &[&authority_seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint_liquidity.to_account_info(),
                to: ctx.accounts.depositor_account_liquidity.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            signer_seeds,
        ),
        liquidity,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(
        mut,
        seeds = [
            pool.amm.key().as_ref(),
            pool.mint_a.key().as_ref(),
            pool.mint_b.key().as_ref()
        ],
        bump,
        has_one = mint_a,
        has_one = mint_b
    )]
    pool: Box<Account<'info, Pool>>,

    /// CHECK read-only account
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
        mint::decimals = 6,
        mint::authority = pool_authority
    )]
    pub mint_liquidity: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = pool_authority,
    )]
    pool_account_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = pool_authority,
    )]
    pool_account_b: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = depositor,
    )]
    depositor_account_a: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_b,
        associated_token::authority = depositor,
    )]
    depositor_account_b: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = mint_liquidity,
        associated_token::authority = depositor,
    )]
    depositor_account_liquidity: Account<'info, TokenAccount>,

    #[account(mut)]
    depositor: Signer<'info>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    associated_token_program: Program<'info, AssociatedToken>,
}