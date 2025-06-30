# 📦 Solana Todo App (Anchor + React + Chakra UI)

This is a full-stack Todo App built on the **Solana blockchain**, using:

- 🦀 `Rust` and `Anchor` for smart contract development and deployment
- ⚛️ `React` + `Chakra UI` for the frontend interface
- 🔐 `Solana Wallet Adapter` for wallet connections (Phantom, Backpack, etc.)
- ⚙️ `React Query` to manage state and handle mutations

---

## ✅ Tools & Versions Used

| Tool            | Version                       |
|-----------------|-------------------------------|
| `Rust`          | `1.72.0`                       |
| `Solana CLI`    | `2.1.22`                       |
| `Anchor CLI`    | `0.31.1`                       |
| `Node.js`       | `v18.19.1`                     |

> ⚠️ Ensure you use the correct versions to avoid build or deployment errors.

---

## ⚙️ 1. Wallet Setup

### 📍 If you ALREADY have a wallet:

Edit the `wallet` field in `code/Anchor.toml` to point to your wallet file:

```toml
wallet = "/home/username/.config/solana/id.json"
```

> (On Windows WSL, it might look like `/mnt/c/Users/YOURNAME/.config/solana/id.json`)

---

### 🪙 If you DO NOT have a wallet:

Run the following commands to generate a wallet and get airdrop SOL on Devnet:

```bash
# Generate a new wallet
solana-keygen new --outfile ~/.config/solana/id.json

# Set Devnet as default cluster
solana config set --url https://api.devnet.solana.com

# Airdrop 2 SOL into the wallet
solana airdrop 2
```

Check your wallet address with:

```bash
solana address
```

---

## 🔐 2. Update Program ID

Each time you deploy, Anchor generates a new **Program ID**. Do the following:

### 🔍 Step 1: Get the Deployed Program ID

```bash
solana address -k target/deploy/todo_app-keypair.json
```

Example output:

```bash
3uhD8YzbpWyTTqe2DWTncYUpfuNmLfEymMNVBTNbLm64
```

---

### ✏️ Step 2: Update `declare_id!` in smart contract

Edit the file `code/programs/todo-app/src/lib.rs` and update the line:

```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```

Example:

```rust
declare_id!("3uhD8YzbpWyTTqe2DWTncYUpfuNmLfEymMNVBTNbLm64");
```

---

## 🧱 3. Build & Deploy Anchor Program

From the project root (`code/`), run:

```bash
anchor build
anchor deploy
```

Make sure your `declare_id!` matches your deployed program ID.

---

## 🖥️ 4. Run the Frontend

Navigate to `code/app`:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 5. Check Connected Wallet

After connecting wallet in the UI:

- Open browser DevTools → Console
- Look for the log:

```ts
Wallet public key: 6eZYXRpK92BWY1jS7ioyFifG12jyTTDhiTj9z9PRuzTi
```

Ensure this wallet has **SOL on Devnet**, or run:

```bash
solana airdrop 2 6eZYXRpK92BWY1jS7ioyFifG12jyTTDhiTj9z9PRuzTi
```

---

## 🚀 Features

- ✅ Create on-chain **profile**
- ✅ Add on-chain **todos** (PDA-based)
- ✅ Wallet connection with Phantom, Backpack
- ✅ Modern Chakra UI interface with modals
- 🔁 Realtime state updates using React Query

---

## 📁 Project Structure

```
code/
├── app/                    # React + Chakra UI + Wallet Adapter frontend
├── programs/
│   └── todo-app/           # Smart contract in Rust using Anchor
├── migrations/             # Deploy scripts
├── target/                 # Build output (.so, IDL, keypair, etc.)
├── Anchor.toml             # Anchor configuration
└── README.md               # This file
```

---

## 📝 Notes

- If you see `DeclaredProgramIdMismatch`, make sure:
  - `declare_id!` matches the actual deployed ID
  - You re-built the project after updating the ID

- If you see `Attempt to debit an account but found no record of a prior credit`, the wallet likely has no SOL → Airdrop to the correct address.

---

## 🧠 Resources

- [Solana Docs](https://docs.solana.com)
- [Anchor Book](https://book.anchor-lang.com)
- [Wallet Adapter Guide](https://github.com/solana-labs/wallet-adapter)

---

## 📜 License

MIT © 2025 – Solana Bootcamp Project