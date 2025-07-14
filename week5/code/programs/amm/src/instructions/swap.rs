use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};


use crate::{errors::AppError, state::Pool, utils::mul_div_u64};

pub fn swap(
    ctx: Context<Swap>,
    swap_a: bool,
    input_amount: u64,
    min_output_amount: u64,
) -> Result<()> {
    let (pool_in, pool_out, user_in, user_out) = if swap_a {
        (
            &ctx.accounts.pool_account_a,
            &ctx.accounts.pool_account_b,
            &ctx.accounts.user_account_a,
            &ctx.accounts.user_account_b,
        )
    } else {
        (
            &ctx.accounts.pool_account_b,
            &ctx.accounts.pool_account_a,
            &ctx.accounts.user_account_b,
            &ctx.accounts.user_account_a,
        )
    };

    let amm = &ctx.accounts.amm;
    let fee = amm.fee as u64;

    // Calculate fee and net input
    let fee_amount = input_amount * fee / 10_000;
    let net_input = input_amount - fee_amount;

    // Apply constant product formula: Δy = (Y * Δx) / (X + Δx)
    let output_amount = mul_div_u64(pool_out.amount, net_input, pool_in.amount + net_input)?;

    require!(output_amount >= min_output_amount, AppError::OutputTooSmall);

    let authority_bump = ctx.bumps.pool_authority;
    let authority_seeds = &[
        &ctx.accounts.pool.amm.to_bytes(),
        &ctx.accounts.pool.mint_a.to_bytes(),
        &ctx.accounts.pool.mint_b.to_bytes(),
        b"authority".as_ref(),
        &[authority_bump],
    ];


    let signer_seeds = &[&authority_seeds[..]];

    // Transfer input token from user to pool
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: user_in.to_account_info(),
                to: pool_in.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        input_amount,
    )?;

    // Transfer output token from pool to user
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: pool_out.to_account_info(),
                to: user_out.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            signer_seeds,
        ),
        output_amount,
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"amm", amm.id.as_ref()],
        bump
    )]
    pub amm: Box<Account<'info, crate::state::Amm>>,

    #[account(
        mut,
        seeds = [pool.amm.key().as_ref(), pool.mint_a.key().as_ref(), pool.mint_b.key().as_ref()],
        bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK
    #[account(
        seeds = [
            pool.amm.key().as_ref(),
            pool.mint_a.key().as_ref(),
            pool.mint_b.key().as_ref(),
            b"authority"
        ],
        bump
    )]
    pub pool_authority: AccountInfo<'info>,

    #[account(mut)]
    pub pool_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_account_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_account_b: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
