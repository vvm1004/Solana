// File: tests/swap.test.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Amm } from "../target/types/amm";
import { assert } from "chai";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { mintToken } from "./utils";
import {
    getAccount,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "bn.js";
import fs from "fs";

// Setup
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.Amm as Program<Amm>;

// Load depositor from local keypair file
const depositor = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync("/mnt/f/Solana_Keypair/payer.json", "utf8")))
);

const mintADecimals = 0;
const mintBDecimals = 0;
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
    id = anchor.web3.Keypair.generate().publicKey;
    ammPda = anchor.web3.PublicKey.findProgramAddressSync([
        Buffer.from("amm"),
        id.toBuffer(),
    ], program.programId)[0];

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
        decimals: mintADecimals,
        amount: 10000,
    });
    await mintToken({
        connection: provider.connection,
        payer: depositor,
        receiver: depositor.publicKey,
        mint: mintBKp,
        decimals: mintBDecimals,
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

    poolAccountA = getAssociatedTokenAddressSync(
        mintAKp.publicKey,
        poolAuthorityPda,
        true
    );
    poolAccountB = getAssociatedTokenAddressSync(
        mintBKp.publicKey,
        poolAuthorityPda,
        true
    );
    depositorAccountA = getAssociatedTokenAddressSync(
        mintAKp.publicKey,
        depositor.publicKey
    );
    depositorAccountB = getAssociatedTokenAddressSync(
        mintBKp.publicKey,
        depositor.publicKey
    );
    depositorAccountLiquidity = getAssociatedTokenAddressSync(
        mintLiquidityPda,
        depositor.publicKey
    );

    await program.methods.createPool().accounts({
        pool: poolPda,
        poolAuthority: poolAuthorityPda,
        mintLiquidity: mintLiquidityPda,
        amm: ammPda,
        mintA: mintAKp.publicKey,
        mintB: mintBKp.publicKey,
        poolAccountA: poolAccountA,
        poolAccountB: poolAccountB,
        payer: provider.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
    } as any).rpc();

    await program.methods.depositLiquidity(
        new BN(100), new BN(200)
    ).accounts({
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

describe("swap", () => {
    it("swap A for B", async () => {
        const amountIn = new BN(10);
        const minOut = new BN(1); // set according to your slippage logic

        const tx = await program.methods.swap(true, amountIn, minOut).accounts({
            amm: ammPda, 
            pool: poolPda,
            poolAuthority: poolAuthorityPda,
            mintA: mintAKp.publicKey,
            mintB: mintBKp.publicKey,
            poolAccountA,
            poolAccountB,
            userAccountA: depositorAccountA,
            userAccountB: depositorAccountB,
            user: depositor.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
            .signers([depositor]).rpc();

        console.log("Swap tx:", tx);

        const poolA = await getAccount(provider.connection, poolAccountA);
        const poolB = await getAccount(provider.connection, poolAccountB);

        assert(poolA.amount >= 110, "Token A increased");
        assert(poolB.amount <= 200, "Token B decreased");
    });
});
