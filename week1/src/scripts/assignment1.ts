import {
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
    PublicKey,
  } from "@solana/web3.js";
  
  import { connection, payer } from "../lib/vars";
  import { explorerURL, printConsoleSeparator } from "../lib/helpers";
  
  (async () => {
    console.log("Payer:", payer.publicKey.toBase58());
  
    // 1. Create new account
    const newAccount = Keypair.generate();
    console.log("New account:", newAccount.publicKey.toBase58());
  
    // Amount to fund new account (0.2 SOL)
    const fundAmount = 0.2 * LAMPORTS_PER_SOL;
  
    // 2. Transfer target (STATIC_PUBLICKEY from assignment)
    const target = new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs");
    const transferAmount = 0.1 * LAMPORTS_PER_SOL;
  
    // Calculate minimum rent exemption (0 bytes)
    const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(0);
  
    // 3. Build instructions
  
    // a. Create new account and fund it
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: newAccount.publicKey,
      lamports: fundAmount,
      space: 0,
      programId: SystemProgram.programId,
    });
  
    // b. Transfer 0.1 SOL from new account to STATIC_PUBLICKEY
    const transferIx = SystemProgram.transfer({
      fromPubkey: newAccount.publicKey,
      toPubkey: target,
      lamports: transferAmount,
    });
  
    // c. Transfer remaining balance back to payer to "close" new account
    const closeAccountIx = SystemProgram.transfer({
      fromPubkey: newAccount.publicKey,
      toPubkey: payer.publicKey,
      lamports: fundAmount - transferAmount,
    });
  
    // 4. Build transaction
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash,
      instructions: [createAccountIx, transferIx, closeAccountIx],
    }).compileToV0Message();
  
    const tx = new VersionedTransaction(messageV0);
  
    // Sign with both payer and new account
    tx.sign([payer, newAccount]);
  
    // Send transaction
    const sig = await connection.sendTransaction(tx);
    await connection.confirmTransaction(sig, "confirmed");
  
    printConsoleSeparator("Transaction Completed");
    console.log("Explorer:", explorerURL({ txSignature: sig }));
  })();
  