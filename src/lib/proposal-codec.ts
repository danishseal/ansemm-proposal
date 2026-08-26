// Browser-safe proposal/vote/comment memo codec, shared by the server reader
// (bwick-community.ts) and the client wallet provider. INTEROPERABLE with
// @chanseproposalbot (core/proposals.ts) — see bwick-community.ts for the
// full wire contract. No fetch, no Node-only APIs, so it is safe to import
// into client components.

export const PROP_PREFIX = "ansem-prop:v1:";
export const VOTE_PREFIX = "ansem-vote:v1:";
export const COMMENT_PREFIX = "ansem-comment:v1:";
export const MAX_OPTIONS = 10;

/** UTF-8 → standard base64, works in both browser and Node. */
export function toBase64Utf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  if (typeof btoa === "function") {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }
  // Node fallback
  return Buffer.from(bytes).toString("base64");
}

/** standard base64 → UTF-8 string, works in both browser and Node. */
export function fromBase64Utf8(b64: string): string {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, "base64").toString("utf8");
}

/** A parsed vote choice: binary yes/no, or a 0-indexed option. */
export type ParsedChoice =
  | { kind: "binary"; vote: "yes" | "no" }
  | { kind: "option"; index: number };

export function parseChoiceToken(raw: string): ParsedChoice | null {
  if (raw === "yes" || raw === "no") return { kind: "binary", vote: raw };
  if (raw.startsWith("opt-")) {
    const t = raw.slice(4);
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t);
    if (n < 0 || n >= MAX_OPTIONS) return null;
    return { kind: "option", index: n };
  }
  return null;
}

/** Build a proposal memo. Omit `options` (or pass <2) for a binary Yes/No.
 *  Key order title/description/options is byte-compatible with the bot. */
export function encodeProposalMemo(
  title: string,
  description: string,
  options?: string[],
): string {
  const body: { title: string; description: string; options?: string[] } = {
    title,
    description,
  };
  if (options && options.length >= 2) body.options = options;
  return PROP_PREFIX + toBase64Utf8(JSON.stringify(body));
}

/** choice is "yes"/"no" for binary or a 0-indexed option number for multi. */
export function encodeVoteMemo(
  proposalId: string,
  choice: "yes" | "no" | number,
): string {
  const token = typeof choice === "number" ? `opt-${choice}` : choice;
  return `${VOTE_PREFIX}${proposalId}:${token}`;
}

export function encodeCommentMemo(proposalId: string, body: string): string {
  return `${COMMENT_PREFIX}${proposalId}:${toBase64Utf8(body)}`;
}
