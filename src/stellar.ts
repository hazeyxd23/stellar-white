import {
  requestAccess,
  getAddress,
  getNetwork,
  isConnected,
  signTransaction,
} from "@stellar/freighter-api";
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";

// ---- Network config -------------------------------------------------
export const HORIZON_TESTNET_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;

export const server = new Horizon.Server(HORIZON_TESTNET_URL);

// ---- Types ------------------------------------------------------------
export interface PaymentResult {
  success: boolean;
  hash?: string;
  message: string;
}

// ---- Wallet -------------------------------------------------------------

/** Checks whether the Freighter browser extension is installed. */
export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const { isConnected: connected } = await isConnected();
    return !!connected;
  } catch {
    return false;
  }
}

/** Prompts the user to grant this site access to their Freighter wallet. */
export async function connectWallet(): Promise<string> {
  const access = await requestAccess();
  if (access.error) {
    throw new Error(access.error.message ?? "Wallet access was denied.");
  }

  const network = await getNetwork();
  if (network.error) {
    throw new Error(network.error.message ?? "Could not read network from Freighter.");
  }
  if (network.network !== "TESTNET") {
    throw new Error(
      `Freighter is set to ${network.network}. Switch it to Testnet in the extension settings and try again.`
    );
  }

  return access.address;
}

/** Re-reads the currently authorized address (used to restore a session). */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const result = await getAddress();
    if (result.error || !result.address) return null;
    return result.address;
  } catch {
    return null;
  }
}

// ---- Balance ------------------------------------------------------------

/** Fetches the native XLM balance for a public key on testnet. */
export async function fetchXlmBalance(publicKey: string): Promise<string> {
  const account = await server.loadAccount(publicKey);
  const native = account.balances.find((b) => b.asset_type === "native");
  return native ? native.balance : "0";
}

/** Funds a brand-new testnet account using Friendbot. */
export async function fundWithFriendbot(publicKey: string): Promise<void> {
  const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Friendbot funding failed: ${body}`);
  }
}

// ---- Payments -----------------------------------------------------------

/**
 * Builds, signs (via Freighter) and submits a native XLM payment on testnet.
 */
export async function sendXlmPayment(
  sourcePublicKey: string,
  destinationPublicKey: string,
  amount: string,
  memo?: string
): Promise<PaymentResult> {
  try {
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    let builder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    }).addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset: Asset.native(),
        amount,
      })
    );

    if (memo) {
      builder = builder.addMemo(Memo.text(memo.slice(0, 28)));
    }

    const transaction = builder.setTimeout(120).build();

    const signed = await signTransaction(transaction.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: sourcePublicKey,
    });

    if (signed.error) {
      return { success: false, message: signed.error.message ?? "Signing was rejected." };
    }

    const signedTransaction = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      NETWORK_PASSPHRASE
    );

    const submitResult = await server.submitTransaction(signedTransaction);

    return {
      success: true,
      hash: submitResult.hash,
      message: "Payment submitted and confirmed on Stellar testnet.",
    };
  } catch (err: any) {
    const extras = err?.response?.data?.extras?.result_codes;
    const detail = extras ? JSON.stringify(extras) : err?.message ?? String(err);
    return { success: false, message: `Transaction failed: ${detail}` };
  }
}

export function isValidStellarPublicKey(key: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(key.trim());
}
