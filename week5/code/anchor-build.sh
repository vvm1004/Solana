#!/bin/bash

export PATH="/mnt/f/Solana/solana-release/bin:$PATH"

# Kiểm tra phiên bản đang dùng
echo "Using Solana version:"
solana --version

# Build bằng Anchor CLI
anchor build
