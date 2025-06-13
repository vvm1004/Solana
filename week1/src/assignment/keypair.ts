// Import necessary modules from Solana web3 and other libraries
import { Keypair } from '@solana/web3.js';
import base58 from "bs58";
import * as fs from 'fs';

// Define the private key as a base58-encoded string (exported from Phantom wallet)
const PRIVATE_KEY = '2EtwmcpBVdUpmLBHzMkNAu6i7Sr25dp6JZEtxarsBvoezvdqiiHQX1aFxDjPgg3tKC29a3rky65rqEhDJ9c4NhYd'

// Define the expected public key for verification
const PUBLIC_KEY = "88neeRnVvGNg9ai9s3MAMjE9Sgv8HttNGdpehoqLmSVw";

// Decode the base58-encoded private key to a Uint8Array (secret key format)
const secret = base58.decode(PRIVATE_KEY);

// Generate a Keypair from the secret key
const pair = Keypair.fromSecretKey(secret);

// Check if the derived public key matches the provided public key
if (pair.publicKey.toString() == PUBLIC_KEY) {

    // If the public key matches, save the secret key as a JSON file
    fs.writeFileSync(
        'private_key.json',
        JSON.stringify(Array.from(secret)) // Convert Uint8Array to array of numbers
    );
}
