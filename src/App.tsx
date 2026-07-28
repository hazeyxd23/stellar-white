import { useEffect, useState, useCallback } from "react";
import {
  checkFreighterInstalled,
  connectWallet,
  getConnectedAddress,
  fetchXlmBalance,
  fundWithFriendbot,
  sendXlmPayment,
  isValidStellarPublicKey,
} from "./stellar";

interface LogEntry {
  id: string;
  status: "pending" | "success" | "error";
  message: string;
  hash?: string;
  timestamp: string;
}

function short(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function explorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export default function App() {
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [log, setLog] = useState<LogEntry[]>([]);

  const pushLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLog((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  }, []);

  const refreshBalance = useCallback(async (pubKey: string) => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const bal = await fetchXlmBalance(pubKey);
      setBalance(bal);
    } catch (err: any) {
      if (String(err?.response?.status) === "404") {
        setBalance("0");
        setBalanceError("Account not yet funded on testnet.");
      } else {
        setBalanceError(err?.message ?? "Could not load balance.");
      }
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // Detect Freighter + restore an already-authorized session on load.
  useEffect(() => {
    (async () => {
      const installed = await checkFreighterInstalled();
      setFreighterInstalled(installed);
      if (installed) {
        const existing = await getConnectedAddress();
        if (existing) {
          setAddress(existing);
          refreshBalance(existing);
        }
      }
    })();
  }, [refreshBalance]);

  async function handleConnect() {
    setConnecting(true);
    setConnectError(null);
    try {
      const pubKey = await connectWallet();
      setAddress(pubKey);
      await refreshBalance(pubKey);
    } catch (err: any) {
      setConnectError(err?.message ?? "Could not connect to Freighter.");
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setBalance(null);
    setBalanceError(null);
    setConnectError(null);
  }

  async function handleFund() {
    if (!address) return;
    setFunding(true);
    try {
      await fundWithFriendbot(address);
      await refreshBalance(address);
      pushLog({ status: "success", message: "Friendbot funded this account with test XLM." });
    } catch (err: any) {
      pushLog({ status: "error", message: err?.message ?? "Friendbot funding failed." });
    } finally {
      setFunding(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!address) return;
    const dest = destination.trim();

    if (!isValidStellarPublicKey(dest)) {
      setFormError("Enter a valid Stellar public key (starts with G, 56 characters).");
      return;
    }
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setFormError("Enter an amount greater than 0.");
      return;
    }

    setSending(true);
    pushLog({ status: "pending", message: `Submitting payment of ${amount} XLM to ${short(dest)}…` });

    const result = await sendXlmPayment(address, dest, amount, memo || undefined);

    if (result.success) {
      pushLog({ status: "success", message: result.message, hash: result.hash });
      setDestination("");
      setAmount("");
      setMemo("");
      await refreshBalance(address);
    } else {
      pushLog({ status: "error", message: result.message });
    }
    setSending(false);
  }

  return (
    <div className="app-shell">
      <div className="app-heading">
        <span className="eyebrow">Level 1 · White Belt</span>
        <h1>stellar-pay</h1>
        <p>Connect Freighter, check your balance, and send XLM on Stellar testnet.</p>
      </div>

      <div className="terminal">
        <div className="terminal-titlebar">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="terminal-title">stellar-pay — testnet</span>
          <span className="terminal-badge">TESTNET</span>
        </div>

        <div className="terminal-body">
          <div className="prompt-line">
            <span className="prompt-user">hazey@stellar</span>
            <span>:</span>
            <span className="prompt-path">~/white-belt</span>
            <span className="prompt-sigil">$</span>
            <span>{address ? "wallet --status connected" : "wallet --connect freighter"}</span>
            <span className="cursor" />
          </div>

          {/* ---- Wallet panel ---- */}
          <div className="panel">
            <span className="panel-label">Wallet</span>

            {freighterInstalled === false && (
              <p className="hint error">
                Freighter extension not detected. Install it from{" "}
                <a href="https://www.freighter.app/" target="_blank" rel="noreferrer">
                  freighter.app
                </a>{" "}
                and reload this page.
              </p>
            )}

            {!address ? (
              <div className="row">
                <button
                  className="primary"
                  onClick={handleConnect}
                  disabled={connecting || freighterInstalled === false}
                >
                  {connecting ? "Connecting…" : "Connect Freighter"}
                </button>
                {connectError && <span className="hint error">{connectError}</span>}
              </div>
            ) : (
              <div className="row">
                <span className="address-pill">{address}</span>
                <button className="ghost" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* ---- Balance panel ---- */}
          {address && (
            <div className="panel">
              <span className="panel-label">Balance</span>
              <div className="row">
                <div>
                  {balanceLoading ? (
                    <span className="hint">loading…</span>
                  ) : (
                    <span>
                      <span className="balance-value">
                        {balance ? Number(balance).toFixed(4) : "0.0000"}
                      </span>
                      <span className="balance-unit">XLM</span>
                    </span>
                  )}
                  {balanceError && <div className="hint error">{balanceError}</div>}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button onClick={() => refreshBalance(address)} disabled={balanceLoading}>
                    Refresh
                  </button>
                  {balanceError && (
                    <button onClick={handleFund} disabled={funding}>
                      {funding ? "Funding…" : "Fund via Friendbot"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---- Send panel ---- */}
          {address && (
            <form className="panel" onSubmit={handleSend}>
              <span className="panel-label">Send XLM</span>
              <div className="form-grid">
                <label>
                  Destination address
                  <input
                    type="text"
                    placeholder="G..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    disabled={sending}
                  />
                </label>
                <label>
                  Amount (XLM)
                  <input
                    type="number"
                    step="0.0000001"
                    min="0"
                    placeholder="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={sending}
                  />
                </label>
                <label>
                  Memo (optional)
                  <input
                    type="text"
                    placeholder="thanks!"
                    maxLength={28}
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    disabled={sending}
                  />
                </label>
              </div>
              {formError && <span className="hint error">{formError}</span>}
              <div className="row">
                <button className="primary" type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send payment"}
                </button>
              </div>
            </form>
          )}

          {/* ---- Transaction log ---- */}
          <div className="panel">
            <span className="panel-label">Transaction log</span>
            {log.length === 0 ? (
              <span className="empty-log">No transactions yet — output will appear here.</span>
            ) : (
              <div className="log">
                {log.map((entry) => (
                  <div key={entry.id} className={`log-entry ${entry.status}`}>
                    <span className="log-status">
                      [{entry.status.toUpperCase()}] {entry.timestamp}
                    </span>
                    <span>{entry.message}</span>
                    {entry.hash && (
                      <a href={explorerUrl(entry.hash)} target="_blank" rel="noreferrer">
                        {entry.hash}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="footer-note">
        Stellar Testnet · built for RiseIn Level 1 — White Belt
      </div>
    </div>
  );
}
