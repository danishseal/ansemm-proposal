// Cosmos wallet adapter shared by the voting flow.
// Two compatible providers (both speak the Keplr surface):
//   1. window.bwickWallet.cosmos — BWICK Wallet extension's native shim
//   2. window.keplr            — standalone Keplr extension

import type { OfflineSigner } from "@cosmjs/proto-signing";

export type WalletKind = "bwick" | "keplr";

interface KeplrLikeProvider {
  experimentalSuggestChain(info: unknown): Promise<void>;
  enable(chainId: string | string[]): Promise<void>;
  getOfflineSigner(chainId: string): OfflineSigner;
  getKey(chainId: string): Promise<{ name: string; bech32Address: string }>;
  /** Newer Keplr exposes disable() to remove the dApp from the trusted
   *  list for a given chain. Older builds/shims may not — call defensively. */
  disable?(chainId: string | string[]): Promise<void>;
}

declare global {
  interface Window {
    ansemWallet?: { cosmos?: KeplrLikeProvider };
    bwickWallet?: { cosmos?: KeplrLikeProvider };
    keplr?: KeplrLikeProvider;
  }
}

function providerFor(kind: WalletKind): KeplrLikeProvider | null {
  if (typeof window === "undefined") return null;
  // Current ANSEM extension injects under window.ansemWallet; older builds used
  // window.bwickWallet. Prefer the new global, fall back to the legacy one.
  if (kind === "bwick") return window.ansemWallet?.cosmos ?? window.bwickWallet?.cosmos ?? null;
  return window.keplr ?? null;
}

export function availableWallets(): Array<{ kind: WalletKind; label: string }> {
  const out: Array<{ kind: WalletKind; label: string }> = [];
  if (providerFor("bwick")) out.push({ kind: "bwick", label: "ANSEM Wallet" });
  if (providerFor("keplr")) out.push({ kind: "keplr", label: "Keplr" });
  return out;
}

export const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID ?? "ansem-1";
export const RPC =
  process.env.NEXT_PUBLIC_BWICK_RPC ??
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ??
  // HTTPS via val1's Caddy TLS proxy (fronts CometBFT :26657). A plain http://
  // or :port endpoint is blocked as mixed content on an HTTPS deploy.
  "https://rpc.ansemchain.fun";
export const DENOM = process.env.NEXT_PUBLIC_BWICK_DENOM ?? "uchanse";

const CHAIN_INFO = {
  chainId: CHAIN_ID,
  chainName: "ANSEM Chain",
  rpc: RPC,
  rest:
    process.env.NEXT_PUBLIC_BWICK_REST ??
    process.env.NEXT_PUBLIC_REST_ENDPOINT ??
    "https://rest.ansemchain.fun",
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: "ansem",
    bech32PrefixAccPub: "ansempub",
    bech32PrefixValAddr: "ansemvaloper",
    bech32PrefixValPub: "ansemvaloperpub",
    bech32PrefixConsAddr: "ansemvalcons",
    bech32PrefixConsPub: "ansemvalconspub",
  },
  currencies: [{ coinDenom: "CHANSE", coinMinimalDenom: DENOM, coinDecimals: 6 }],
  feeCurrencies: [
    {
      coinDenom: "CHANSE",
      coinMinimalDenom: DENOM,
      coinDecimals: 6,
      gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 },
    },
  ],
  stakeCurrency: { coinDenom: "CHANSE", coinMinimalDenom: DENOM, coinDecimals: 6 },
};

export interface ConnectedWallet {
  address: string;
  name: string;
  signer: OfflineSigner;
  kind: WalletKind;
}

export async function disconnectWallet(kind: WalletKind): Promise<void> {
  const provider = providerFor(kind);
  if (!provider?.disable) return;
  try {
    await provider.disable(CHAIN_ID);
  } catch (err) {
    // disable() throws on some builds when the dApp isn't currently permitted —
    // safe to ignore, the user-visible state is reset either way.
    console.warn("wallet disable:", err);
  }
}

export async function connectWallet(kind?: WalletKind): Promise<ConnectedWallet> {
  const installed = availableWallets();
  if (installed.length === 0) {
    throw new Error("No Cosmos wallet detected. Install ANSEM Wallet or Keplr.");
  }
  const chosen = kind ?? installed[0]!.kind;
  const provider = providerFor(chosen);
  if (!provider) {
    throw new Error(
      `${chosen === "bwick" ? "ANSEM Wallet" : "Keplr"} not detected.`,
    );
  }
  try {
    await provider.experimentalSuggestChain(CHAIN_INFO);
  } catch (err) {
    console.warn("suggestChain:", err);
  }
  await provider.enable(CHAIN_ID);
  const signer = provider.getOfflineSigner(CHAIN_ID);
  const key = await provider.getKey(CHAIN_ID);
  return { address: key.bech32Address, name: key.name, signer, kind: chosen };
}
