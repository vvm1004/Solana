use anchor_lang::prelude::*;
use instructions::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("81WWst6eHgu6xi5UL63D5t37K2aXLwVNPqThhMFm4ury");

#[program]
pub mod stake_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        instructions::stake(ctx, amount)
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        instructions::unstake(ctx, amount)
    }
}
