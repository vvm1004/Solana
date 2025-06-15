import {
    Connection,
    clusterApiUrl,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
  } from "@solana/web3.js";
  import {
    createMint,
    getOrCreateAssociatedTokenAccount,
    createMintToInstruction,
  } from "@solana/spl-token";
  
  import {
    createCreateMetadataAccountV2Instruction,
    createCreateMetadataAccountV3Instruction,
    CreateMetadataAccountArgsV3,
    DataV2,
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  } from "@metaplex-foundation/mpl-token-metadata";
  
  import { payer } from "../lib/vars"; 
  import { Buffer } from "buffer";
  
  async function main() {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    console.log("Wallet public key:", payer.publicKey.toBase58());
  
    const receiverPubkey = new PublicKey(
      "63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs"
    );
  
    // 1. Tạo mint token fungible (decimals = 6)
    const decimals = 6;
    const fungibleMint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      decimals
    );
  
    // 2. Tạo mint token NFT (decimals = 0)
    const nftMint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      0
    );
  
    // 3. Tạo associated token accounts cho fungible token
    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      fungibleMint,
      payer.publicKey
    );
  
    const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      fungibleMint,
      receiverPubkey
    );
  
    // 4. Tạo associated token account cho NFT (cho payer)
    const payerNftTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      nftMint,
      payer.publicKey
    );
  
    // 5. Tạo PDA metadata cho NFT mint
    const [metadataPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nftMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
  
    // 6. Chuẩn bị metadata data cho NFT
    const metadataData: DataV2 = {
      name: "MyNFT",
      symbol: "MYN",
      uri: "https://raw.githubusercontent.com/vvm1004/Solana/main/assets/nft.json",
      sellerFeeBasisPoints: 1000, // 10% royalty
      creators: [
        {
          address: payer.publicKey,
          verified: true,
          share: 100,
        },
      ],
      collection: null,
      uses: null,
    };
  
    const metadataArgs: CreateMetadataAccountArgsV3 = {
        data: metadataData,
        isMutable: true,
        collectionDetails: null, 
      };
  
    // 7. Tạo instruction metadata
    const createMetadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: nftMint,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey,
      },
      {
        createMetadataAccountArgsV3: metadataArgs,
      }
    );
  
    // 8. Tạo transaction và add các instruction
    const transaction = new Transaction();
  
    // Mint 100 fungible token cho payer
    transaction.add(
      createMintToInstruction(
        fungibleMint,
        payerTokenAccount.address,
        payer.publicKey,
        100 * 10 ** decimals
      )
    );
  
    // Mint 10 fungible token cho receiver
    transaction.add(
      createMintToInstruction(
        fungibleMint,
        receiverTokenAccount.address,
        payer.publicKey,
        10 * 10 ** decimals
      )
    );
  
    // Mint 1 NFT cho payer
    transaction.add(
      createMintToInstruction(
        nftMint,
        payerNftTokenAccount.address,
        payer.publicKey,
        1
      )
    );
  
    // Thêm instruction tạo metadata NFT
    transaction.add(createMetadataIx);
  
    // 9. Gửi transaction
    const txSignature = await sendAndConfirmTransaction(connection, transaction, [
      payer,
    ]);
  
    console.log("Transaction signature:", txSignature);
    console.log("Fungible token mint address:", fungibleMint.toBase58());
    console.log("NFT mint address:", nftMint.toBase58());
    console.log(
      "Transaction link:",
      `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
    );
  }
  
  main().catch((error) => {
    console.error(error);
  });
  