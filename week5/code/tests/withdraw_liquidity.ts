import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { assert } from "chai";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "bn.js";
import fs from "fs";
import { mintToken } from "./utils";

// Setup
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.Amm as Program<Amm>;

// Load depositor from local keypair file
const depositor = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync("/mnt/f/Solana_Keypair/payer.json", "utf8")))
);

// Helpers
const ensureBalance = async (pubkey: anchor.web3.PublicKey, minLamports: number) => {
  const balance = await provider.connection.getBalance(pubkey);
  if (balance < minLamports) {
    console.log(`Airdropping to ${pubkey.toBase58()}...`);
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(pubkey, anchor.web3.LAMPORTS_PER_SOL)
    );
  } else {
    console.log(`Balance OK: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
  }
};

// State
let id: anchor.web3.PublicKey;
let fee = 100;
let ammPda: anchor.web3.PublicKey;
let mintAKp: anchor.web3.Keypair;
let mintBKp: anchor.web3.Keypair;
let poolPda: anchor.web3.PublicKey;
let poolAuthorityPda: anchor.web3.PublicKey;
let mintLiquidityPda: anchor.web3.PublicKey;
let poolAccountA: anchor.web3.PublicKey;
let poolAccountB: anchor.web3.PublicKey;
let depositorAccountA: anchor.web3.PublicKey;
let depositorAccountB: anchor.web3.PublicKey;
let depositorAccountLiquidity: anchor.web3.PublicKey;

before(async () => {
  await ensureBalance(depositor.publicKey, anchor.web3.LAMPORTS_PER_SOL * 2);

  id = anchor.web3.Keypair.generate().publicKey;
  ammPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("amm"), id.toBuffer()],
    program.programId
  )[0];

  await program.methods.createAmm(id, fee).accounts({
    amm: ammPda,
    admin: provider.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  } as any).rpc();

  mintAKp = anchor.web3.Keypair.generate();
  mintBKp = anchor.web3.Keypair.generate();

  await mintToken({
    connection: provider.connection,
    payer: depositor,
    receiver: depositor.publicKey,
    mint: mintAKp,
    decimals: 0,
    amount: 10000,
  });
  await mintToken({
    connection: provider.connection,
    payer: depositor,
    receiver: depositor.publicKey,
    mint: mintBKp,
    decimals: 0,
    amount: 20000,
  });

  poolPda = anchor.web3.PublicKey.findProgramAddressSync([
    ammPda.toBuffer(),
    mintAKp.publicKey.toBuffer(),
    mintBKp.publicKey.toBuffer(),
  ], program.programId)[0];

  poolAuthorityPda = anchor.web3.PublicKey.findProgramAddressSync([
    ammPda.toBuffer(),
    mintAKp.publicKey.toBuffer(),
    mintBKp.publicKey.toBuffer(),
    Buffer.from("authority"),
  ], program.programId)[0];

  mintLiquidityPda = anchor.web3.PublicKey.findProgramAddressSync([
    ammPda.toBuffer(),
    mintAKp.publicKey.toBuffer(),
    mintBKp.publicKey.toBuffer(),
    Buffer.from("mint_liquidity"),
  ], program.programId)[0];

  poolAccountA = getAssociatedTokenAddressSync(mintAKp.publicKey, poolAuthorityPda, true);
  poolAccountB = getAssociatedTokenAddressSync(mintBKp.publicKey, poolAuthorityPda, true);
  depositorAccountA = getAssociatedTokenAddressSync(mintAKp.publicKey, depositor.publicKey);
  depositorAccountB = getAssociatedTokenAddressSync(mintBKp.publicKey, depositor.publicKey);
  depositorAccountLiquidity = getAssociatedTokenAddressSync(mintLiquidityPda, depositor.publicKey);

  await program.methods.createPool().accounts({
    pool: poolPda,
    poolAuthority: poolAuthorityPda,
    mintLiquidity: mintLiquidityPda,
    amm: ammPda,
    mintA: mintAKp.publicKey,
    mintB: mintBKp.publicKey,
    poolAccountA,
    poolAccountB,
    payer: provider.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    systemProgram: anchor.web3.SystemProgram.programId,
  } as any).rpc();

  await program.methods.depositLiquidity(new BN(100), new BN(200)).accounts({
    pool: poolPda,
    poolAuthority: poolAuthorityPda,
    mintLiquidity: mintLiquidityPda,
    mintA: mintAKp.publicKey,
    mintB: mintBKp.publicKey,
    poolAccountA,
    poolAccountB,
    depositorAccountA,
    depositorAccountB,
    depositorAccountLiquidity,
    depositor: depositor.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    systemProgram: anchor.web3.SystemProgram.programId,
  } as any).signers([depositor]).rpc();
});

describe("withdraw-liquidity", () => {
  it("should withdraw liquidity", async () => {
    const withdrawAmount = new BN(50);

    const tx = await program.methods.withdrawLiquidity(withdrawAmount).accounts({
      pool: poolPda,
      poolAuthority: poolAuthorityPda,
      mintLiquidity: mintLiquidityPda,
      mintA: mintAKp.publicKey,
      mintB: mintBKp.publicKey,
      poolAccountA,
      poolAccountB,
      depositorAccountA,
      depositorAccountB,
      depositorAccountLiquidity,
      depositor: depositor.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as any).signers([depositor]).rpc();

    console.log("Withdraw tx:", tx);

    const lpBalance = await getAccount(provider.connection, depositorAccountLiquidity);
    assert(lpBalance.amount < 100, "LP token was burned");

    const tokenA = await getAccount(provider.connection, depositorAccountA);
    const tokenB = await getAccount(provider.connection, depositorAccountB);
    assert(tokenA.amount > 0, "Token A refunded");
    assert(tokenB.amount > 0, "Token B refunded");
  });
});
