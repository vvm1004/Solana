import {
    createMint,
    createAssociatedTokenAccountInstruction,
    mintTo,
    getAssociatedTokenAddress,
    createMintToInstruction,
} from "@solana/spl-token";
import {
    createCreateMetadataAccountV3Instruction,
    createCreateMasterEditionV3Instruction,
    PROGRAM_ID as METAPLEX_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import {
    Keypair,
    PublicKey,
    TransactionInstruction,
} from "@solana/web3.js";

import {
    connection,
    payer,
    STATIC_PUBLICKEY,
} from "../lib/vars";

import { buildTransaction, explorerURL } from "../lib/helpers";

export async function mintFTandNFT() {
    // 1️⃣ URI metadata thủ công (upload sẵn)
    const ftUri = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/ft.json";
    const nftUri = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/nft.json";

    const instructions: TransactionInstruction[] = [];
    const signers: Keypair[] = [];

    // 2️⃣ MINT FT
    const ftMint = Keypair.generate();
    signers.push(ftMint);

    await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        6,
        ftMint
    );

    const ataSelf = await getAssociatedTokenAddress(ftMint.publicKey, payer.publicKey);
    const ataOther = await getAssociatedTokenAddress(ftMint.publicKey, STATIC_PUBLICKEY);

    instructions.push(
        createAssociatedTokenAccountInstruction(payer.publicKey, ataSelf, payer.publicKey, ftMint.publicKey),
        createAssociatedTokenAccountInstruction(payer.publicKey, ataOther, STATIC_PUBLICKEY, ftMint.publicKey),
        createMintToInstruction(ftMint.publicKey, ataSelf, payer.publicKey, 100 * 1_000_000),
        createMintToInstruction(ftMint.publicKey, ataOther, payer.publicKey, 10 * 1_000_000),
    );

    // 3️⃣ MINT NFT
    const nftMint = Keypair.generate();
    signers.push(nftMint);

    const nftTokenAccount = await getAssociatedTokenAddress(nftMint.publicKey, payer.publicKey);

    instructions.push(
        createAssociatedTokenAccountInstruction(payer.publicKey, nftTokenAccount, payer.publicKey, nftMint.publicKey),
        createMintToInstruction(nftMint.publicKey, nftTokenAccount, payer.publicKey, 1),
    );

    const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            METAPLEX_PROGRAM_ID.toBuffer(),
            nftMint.publicKey.toBuffer(),
        ],
        METAPLEX_PROGRAM_ID
    );

    const [masterEditionPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            METAPLEX_PROGRAM_ID.toBuffer(),
            nftMint.publicKey.toBuffer(),
            Buffer.from("edition"),
        ],
        METAPLEX_PROGRAM_ID
    );

    instructions.push(
        createCreateMetadataAccountV3Instruction({
            metadata: metadataPDA,
            mint: nftMint.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
        }, {
            createMetadataAccountArgsV3: {
                data: {
                    name: "MyNFT",
                    symbol: "MYN",
                    uri: nftUri,
                    sellerFeeBasisPoints: 1000,
                    creators: [{ address: payer.publicKey, share: 100, verified: true }],

                    collection: null,
                    uses: null,
                },
                isMutable: true,
                collectionDetails: null,
            }
        }),
        createCreateMasterEditionV3Instruction({
            edition: masterEditionPDA,
            mint: nftMint.publicKey,
            updateAuthority: payer.publicKey,
            mintAuthority: payer.publicKey,
            metadata: metadataPDA,
            payer: payer.publicKey,
        }, {
            createMasterEditionArgs: {
                maxSupply: new Number(0),
            }
        })
    );

    // 4️⃣ Gửi transaction
    const tx = await buildTransaction({ connection, payer: payer.publicKey, signers: [payer, ...signers], instructions });
    const sig = await connection.sendTransaction(tx, { skipPreflight: false });

    console.log("✅ Transaction signature:", sig);
    console.log(explorerURL({ txSignature: sig }));
}
