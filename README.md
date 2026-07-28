# stellar-pay — Level 1: White Belt

A minimal, terminal-themed Stellar dApp for **RiseIn Level 1 — White Belt**. It connects to the
[Freighter](https://www.freighter.app/) wallet, displays your XLM balance on **Stellar Testnet**,
and lets you send an XLM payment to any address with live transaction feedback.

**Project type:** Simple Payment dApp — send XLM to any address with an amount input.

## Features

- ✅ **Wallet connect / disconnect** via the Freighter browser extension
- ✅ **Network check** — warns you if Freighter isn't set to Testnet
- ✅ **Balance display** — fetches and shows the connected account's native XLM balance from Horizon
- ✅ **One-click Friendbot funding** if your testnet account doesn't exist yet
- ✅ **Send XLM** — build, sign (via Freighter), and submit a payment transaction on testnet
- ✅ **Transaction feedback** — a terminal-style log showing pending / success / error states, the
  transaction hash, and a link to view it on [stellar.expert](https://stellar.expert/explorer/testnet)

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [`@stellar/stellar-sdk`](https://www.npmjs.com/package/@stellar/stellar-sdk) — building/submitting transactions, Horizon client
- [`@stellar/freighter-api`](https://www.npmjs.com/package/@stellar/freighter-api) — wallet connect and signing
- Plain CSS (Catppuccin Mocha palette, JetBrains Mono)

## Prerequisites

1. **Node.js 18+** and npm
2. The **[Freighter](https://www.freighter.app/)** browser extension installed
3. Freighter set to **Testnet**:
   - Open the Freighter extension → Settings (gear icon) → **Network** → select **Testnet**
4. A Freighter wallet with some test XLM. If you don't have any yet, you can:
   - Use the **"Fund via Friendbot"** button that appears in the app once your account shows as
     unfunded, or
   - Visit [Friendbot](https://friendbot.stellar.org) / [laboratory.stellar.org](https://laboratory.stellar.org/#account-creator?network=test) directly

## Setup & run locally

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open the printed local URL (default `http://127.0.0.1:5173`) in a browser that has the Freighter
extension installed.

### Build for production

```bash
npm run build
npm run preview
```

## How to use it

1. Click **Connect Freighter** and approve the connection in the extension popup.
2. Your **XLM balance** loads automatically. Click **Refresh** any time, or **Fund via Friendbot**
   if the account is new/unfunded.
3. Fill in a **destination address** (any valid testnet `G...` public key), an **amount**, and an
   optional memo, then click **Send payment**.
4. Approve the signing request in Freighter. The **transaction log** at the bottom updates with a
   pending entry, then success (with the transaction hash + explorer link) or an error message.
5. Click **Disconnect** to clear the local session.

## Project structure

```
src/
  stellar.ts   # All Stellar/Freighter logic: connect, balance, Friendbot, send payment
  App.tsx      # UI: wallet panel, balance panel, send form, transaction log
  index.css    # Styling
```

## Error handling notes

- Wallet connection failures (extension missing, access denied, wrong network) surface inline
  under the Connect button.
- Balance fetch failures (e.g. account not yet created on testnet) show a hint and a Friendbot
  funding shortcut instead of a raw error.
- Payment failures (insufficient balance, bad destination, op_underfunded, signing rejected, etc.)
  are caught and shown as an `[ERROR]` entry in the transaction log with the underlying Horizon
  result code.
- All amounts and addresses are validated client-side before a transaction is built.

## Screenshots

> Replace these placeholders with your own screenshots before submitting.

| Wallet connected | Balance displayed |
|---|---|
| ![Wallet connected](docs/screenshots/wallet-connected.png) | ![Balance displayed](docs/screenshots/balance-displayed.png) |

| Successful testnet transaction | Transaction result shown to user |
|---|---|
| ![Successful transaction](docs/screenshots/transaction-success.png) | ![Transaction result](docs/screenshots/transaction-result.png) |

## Network

This app only talks to **Stellar Testnet**:

- Horizon: `https://horizon-testnet.stellar.org`
- Friendbot: `https://friendbot.stellar.org`
- Network passphrase: `Test SDF Network ; September 2015`

## License

MIT — built for educational purposes as part of the RiseIn Stellar dApp course.
=======
