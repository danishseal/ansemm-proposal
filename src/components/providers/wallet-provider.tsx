"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GasPrice, SigningStargateClient } from "@cosmjs/stargate";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import {
  CHAIN_ID,
  DENOM,
  RPC,
  availableWallets,
  connectWallet,
  disconnectWallet,
  type WalletKind,
} from "@/lib/wallet";
import {
  encodeProposalMemo,
  encodeVoteMemo,
  encodeCommentMemo,
  COMMENT_PREFIX,
} from "@/lib/proposal-codec";

interface WalletState {
  address: string | null;
  name: string | null;
  kind: WalletKind | null;
  available: { kind: WalletKind; label: string }[];
  connecting: boolean;
  error: string | null;
  connect: (kind?: WalletKind) => Promise<void>;
  disconnect: () => void;
  /** Sign + broadcast a vote on a proposal. `choice` is "yes"/"no" for a
   *  binary proposal, or a 0-indexed option number for a multi-option ballot.
   *  Returns tx hash. */
  castVote: (
    proposalId: string,
    choice: "yes" | "no" | number,
  ) => Promise<string>;
  /** Sign + broadcast a new proposal. Omit `options` (or pass <2) for a
   *  binary Yes/No; pass 2..10 labels for a ballot. Returns tx hash. */
  submitProposal: (
    title: string,
    description: string,
    options?: string[],
  ) => Promise<string>;
  /** Sign + broadcast a comment on a proposal. Returns tx hash.
   *  Throws if the encoded memo would exceed the 256-byte chain soft-limit. */
  submitComment: (proposalId: string, body: string) => Promise<string>;
  /** Approximate max chars allowed in a comment body before the memo bumps
   *  the 256-byte soft limit. Useful for the input character counter. */
  commentBodyLimit: (proposalId: string) => number;
}

const Ctx = createContext<WalletState | null>(null);

const TREASURY =
  process.env.NEXT_PUBLIC_BWICK_TREASURY ??
  // Canonical ANSEM treasury (deployer/admin + launchpad + flagship-proposal
  // recipient). The old bwick1... default is a different chain's prefix, so the
  // chain rejects the send ("hrp does not match bech32 prefix: expected 'ansem'
  // got 'bwick'") and the proposal never lands.
  "ansem1yhlt4665wr0geu6nej6nddgdn0dp03hxsm807a";
// Chain max_memo_characters. Raised to 2048 via governance so multi-option
// ballots and longer descriptions fit (a 10-option memo can be ~1.2KB).
const MEMO_LIMIT = 2048;
const STORAGE_KEY = "frenzy-wallet-kind";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [kind, setKind] = useState<WalletKind | null>(null);
  const [signer, setSigner] = useState<OfflineSigner | null>(null);
  const [available, setAvailable] = useState<{ kind: WalletKind; label: string }[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect installed wallets on mount. Re-poll a few times because extensions
  // inject their providers slightly after page load.
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      setAvailable(availableWallets());
      n += 1;
      if (n >= 5) clearInterval(t);
    }, 400);
    setAvailable(availableWallets());
    return () => clearInterval(t);
  }, []);

  const connect = useCallback(async (k?: WalletKind) => {
    setError(null);
    setConnecting(true);
    try {
      const w = await connectWallet(k);
      setAddress(w.address);
      setName(w.name);
      setKind(w.kind);
      setSigner(w.signer);
      try {
        window.localStorage.setItem(STORAGE_KEY, w.kind);
      } catch { /* quota */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    const k = kind;
    setAddress(null);
    setName(null);
    setKind(null);
    setSigner(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    if (k) void disconnectWallet(k);
  }, [kind]);

  // Auto-reconnect on mount if a prior kind is remembered and the provider
  // is still injected. enable() is a no-op for already-approved chains.
  useEffect(() => {
    if (address) return;
    let stored: WalletKind | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "bwick" || raw === "keplr") stored = raw;
    } catch { /* ignore */ }
    if (!stored) return;
    // Wait a tick so available providers populate first.
    const t = setTimeout(() => {
      const installed = availableWallets();
      if (installed.some((w) => w.kind === stored)) {
        void connect(stored!);
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to account switches in Keplr / ANSEM Wallet.
  useEffect(() => {
    if (!kind) return;
    const handler = () => {
      void connect(kind);
    };
    window.addEventListener("keplr_keystorechange", handler);
    return () => window.removeEventListener("keplr_keystorechange", handler);
  }, [kind, connect]);

  const memoOverheadBytes = useCallback((proposalId: string) => {
    // "ansem-comment:v1:<proposalId>:" — everything except the base64 body.
    return COMMENT_PREFIX.length + proposalId.length + 1;
  }, []);

  const commentBodyLimit = useCallback(
    (proposalId: string) => {
      // Base64 expands by 4/3. We need: overhead + ceil(4 * body / 3) <= 256.
      // → body <= floor((256 - overhead) * 3 / 4)
      const available = MEMO_LIMIT - memoOverheadBytes(proposalId);
      if (available <= 0) return 0;
      return Math.floor((available * 3) / 4);
    },
    [memoOverheadBytes],
  );

  const submitComment = useCallback(
    async (proposalId: string, body: string): Promise<string> => {
      if (!signer || !address) {
        throw new Error("Connect a wallet first.");
      }
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Comment is empty.");

      const memo = encodeCommentMemo(proposalId, trimmed);
      if (new TextEncoder().encode(memo).length > MEMO_LIMIT) {
        throw new Error(
          `Comment too long (${memo.length}/${MEMO_LIMIT} bytes after encoding). Shorten it.`,
        );
      }

      const client = await SigningStargateClient.connectWithSigner(RPC, signer, {
        gasPrice: GasPrice.fromString(`0.025${DENOM}`),
      });
      try {
        const result = await client.sendTokens(
          address,
          TREASURY,
          [{ denom: DENOM, amount: "1" }],
          "auto",
          memo,
        );
        if (result.code !== 0) {
          throw new Error(`Comment failed (code ${result.code}): ${result.rawLog}`);
        }
        return result.transactionHash;
      } finally {
        client.disconnect();
      }
    },
    [signer, address],
  );

  const castVote = useCallback(
    async (
      proposalId: string,
      choice: "yes" | "no" | number,
    ): Promise<string> => {
      if (!signer || !address) {
        throw new Error("Connect a wallet first.");
      }
      const client = await SigningStargateClient.connectWithSigner(RPC, signer, {
        gasPrice: GasPrice.fromString(`0.025${DENOM}`),
      });
      try {
        const memo = encodeVoteMemo(proposalId, choice);
        const result = await client.sendTokens(
          address,
          TREASURY,
          [{ denom: DENOM, amount: "1" }],
          "auto",
          memo,
        );
        if (result.code !== 0) {
          throw new Error(`Vote failed (code ${result.code}): ${result.rawLog}`);
        }
        return result.transactionHash;
      } finally {
        client.disconnect();
      }
    },
    [signer, address],
  );

  const submitProposal = useCallback(
    async (
      title: string,
      description: string,
      options?: string[],
    ): Promise<string> => {
      if (!signer || !address) {
        throw new Error("Connect a wallet first.");
      }
      const t = title.trim();
      const d = description.trim();
      if (!t) throw new Error("Title is required.");
      if (!d) throw new Error("Description is required.");

      let opts: string[] | undefined;
      if (options && options.length > 0) {
        opts = options.map((o) => o.trim()).filter((o) => o.length > 0);
        if (opts.length < 2) {
          throw new Error("A ballot needs at least 2 options (or none for Yes/No).");
        }
        if (opts.length > 10) throw new Error("At most 10 options.");
        if (opts.some((o) => o.length > 60)) {
          throw new Error("Each option must be 60 characters or fewer.");
        }
      }

      const memo = encodeProposalMemo(t, d, opts);
      if (new TextEncoder().encode(memo).length > MEMO_LIMIT) {
        throw new Error(
          `Proposal too long (${new TextEncoder().encode(memo).length}/${MEMO_LIMIT} bytes). ` +
            `Shorten the title, description, or options.`,
        );
      }

      const client = await SigningStargateClient.connectWithSigner(RPC, signer, {
        gasPrice: GasPrice.fromString(`0.025${DENOM}`),
      });
      try {
        const result = await client.sendTokens(
          address,
          TREASURY,
          [{ denom: DENOM, amount: "1" }],
          "auto",
          memo,
        );
        if (result.code !== 0) {
          throw new Error(`Proposal failed (code ${result.code}): ${result.rawLog}`);
        }
        return result.transactionHash;
      } finally {
        client.disconnect();
      }
    },
    [signer, address],
  );

  const value = useMemo<WalletState>(
    () => ({
      address,
      name,
      kind,
      available,
      connecting,
      error,
      connect,
      disconnect,
      castVote,
      submitProposal,
      submitComment,
      commentBodyLimit,
    }),
    [
      address,
      name,
      kind,
      available,
      connecting,
      error,
      connect,
      disconnect,
      castVote,
      submitProposal,
      submitComment,
      commentBodyLimit,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
