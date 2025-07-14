//src/utils.rs
use anchor_lang::prelude::*;
use crate::errors::AppError;

// Helper function to calculate integer square root
pub fn integer_sqrt(n: u128) -> u64 {
    if n == 0 {
        return 0;
    }

    let mut x = n;
    let mut y = (x + 1) / 2;

    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }

    x as u64
}

// Helper function for safe multiplication and division
pub fn mul_div_u64(a: u64, b: u64, c: u64) -> Result<u64> {
    if c == 0 {
        return Err(AppError::CalculationError.into());
    }

    let result = (a as u128)
        .checked_mul(b as u128)
        .ok_or(AppError::CalculationError)?
        .checked_div(c as u128)
        .ok_or(AppError::CalculationError)?;

    if result > u64::MAX as u128 {
        return Err(AppError::CalculationError.into());
    }

    Ok(result as u64)
}
