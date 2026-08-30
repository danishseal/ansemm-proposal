// Community proposal codec + reader.
//
// INTEROPERABLE with @chanseproposalbot (core/proposals.ts). Contract:
//   proposal memo: `ansem-prop:v1:<base64(JSON{title,description[,options]})>`
//     - binary proposal   => NO `options` key; votes are literal "yes"/"no"
//     - multi-option (2..10) => `options:[...]`; votes are `opt-<index>` (0-indexed)
//   vote memo:     `ansem-vote:v1:<proposalId>:<choice>`  (choice = yes|no|opt-N)
//   comment memo:  `ansem-comment:v1:<proposalId>:<base64(utf8 body)>` (site-only)
//   proposalId  =  the CREATE tx's txhash, UPPERCASE hex, case-sensitive.
//   dedup       =  FIRST-vote-wins per wallet per proposal (oldest first).
//   amount      =  1 uchanse to the treasury (anti-spam; the parser ignores it).

// REST endpoint is resolved at runtime via live-config (registry override or the
// baked anchor). The treasury (proposal-submission recipient) is a baked env
// anchor - stable across regenesis, and not held in the config registry.
// Canonical ANSEM treasury. This is also the recipient the reader filters tx
// history on (transfer.recipient=...), so the wrong value returns an empty
// proposal list.
const CANONICAL_TREASURY = "ansem1yhlt4665wr0geu6nej6nddgdn0dp03hxsm807a";
// Honor an env override ONLY if it's an ansem1 address. A stale bwick1... left
// on the Vercel project (a different chain's prefix) would silently make the
// reader query the wrong account and show no proposals — ignore it.
export const BWICK_TREASURY =
  process.env.NEXT_PUBLIC_BWICK_TREASURY?.startsWith("ansem1")
    ? process.env.NEXT_PUBLIC_BWICK_TREASURY
    : CANONICAL_TREASURY;

import {
  PROP_PREFIX,
  VOTE_PREFIX,
  COMMENT_PREFIX,
  MAX_OPTIONS,
  parseChoiceToken,
  fromBase64Utf8,
  type ParsedChoice,
} from "./proposal-codec";
import { getRestEndpoint } from "./live-config";

export interface CommunityProposal {
  id: string;
  proposer: string;
  title: string;
  description: string;
  /** null => binary (Yes/No); otherwise 2..10 option labels. */
  options: string[] | null;
  height: number;
  timestamp: number;
}

export interface CommunityVote {
  voter: string;
  /** For binary proposals: "yes"/"no". For multi: the option label. */
  vote: string;
  /** Index into optionLabels (0-based); for binary, 0=yes, 1=no. */
  choiceIndex: number;
  txHash: string;
  height: number;
  timestamp: number;
}

export interface CommunityComment {
  author: string;
  body: string;
  txHash: string;
  height: number;
  timestamp: number;
}

export interface ProposalWithTally extends CommunityProposal {
  /** True when this is a Yes/No proposal (no options field). */
  binary: boolean;
  /** Labels used for tallying: binary => ["Yes","No"], else the options. */
  optionLabels: string[];
  /** Vote counts parallel to optionLabels. */
  optionCounts: number[];
  totalVotes: number;
  /** The viewer's chosen option index, or null. */
  yourChoice: number | null;

  // ── back-compat fields so existing binary UI keeps rendering ──
  yesCount: number;
  noCount: number;
  yesVotes: number;
  noVotes: number;
  yourVote: "yes" | "no" | null;
}

export interface ProposalWithVotes {
  proposal: ProposalWithTally;
  votes: CommunityVote[];
  comments: CommunityComment[];
}

interface CosmosTxResponse {
  txhash: string;
  height: string;
  timestamp: string;
  code: number;
  tx?: {
    body?: {
      memo?: string;
      messages?: Array<Record<string, unknown> & { "@type": string }>;
    };
  };
}

interface ListResponse {
  tx_responses?: CosmosTxResponse[];
}

async function fetchTreasuryTxs(limit = 200): Promise<CosmosTxResponse[]> {
  // REST endpoint: registry override wins, else the baked anchor.
  const rest = await getRestEndpoint();
  const url = new URL(`${rest.replace(/\/$/, "")}/cosmos/tx/v1beta1/txs`);
  url.searchParams.set("query", `transfer.recipient='${BWICK_TREASURY}'`);
  url.searchParams.set("order_by", "ORDER_BY_DESC");
  url.searchParams.set("pagination.limit", String(limit));

  const res = await fetch(url.toString(), { next: { revalidate: 10 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Treasury tx fetch failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as ListResponse;
  return (json.tx_responses ?? []).filter((tx) => tx.code === 0);
}

function decodePayload(payload: string): unknown {
  return JSON.parse(fromBase64Utf8(payload));
}

function senderFromTx(tx: CosmosTxResponse): string {
  const msg = tx.tx?.body?.messages?.[0];
  return String((msg as Record<string, unknown> | undefined)?.from_address ?? "");
}

function parseProposalFromTx(tx: CosmosTxResponse): CommunityProposal | null {
  const memo = tx.tx?.body?.memo ?? "";
  if (!memo.startsWith(PROP_PREFIX)) return null;

  try {
    const body = decodePayload(memo.slice(PROP_PREFIX.length)) as {
      title?: unknown;
      description?: unknown;
      options?: unknown;
    };

    if (typeof body.title !== "string" || typeof body.description !== "string") {
      return null;
    }

    let options: string[] | null = null;
    if (Array.isArray(body.options)) {
      const opts = body.options
        .filter((o): o is string => typeof o === "string")
        .map((o) => o.trim())
        .filter((o) => o.length >= 1 && o.length <= 60);
      // A valid ballot is 2..10 options; anything else falls back to binary.
      if (opts.length >= 2 && opts.length <= MAX_OPTIONS) options = opts;
    }

    return {
      id: tx.txhash,
      proposer: senderFromTx(tx),
      title: body.title,
      description: body.description,
      options,
      height: Number(tx.height),
      timestamp: new Date(tx.timestamp).getTime(),
    };
  } catch {
    return null;
  }
}

/** A raw parsed vote, before it is matched against a proposal's shape. */
interface RawVote {
  proposalId: string;
  voter: string;
  choice: ParsedChoice;
  txHash: string;
  height: number;
  timestamp: number;
}

function parseVoteFromTx(tx: CosmosTxResponse): RawVote | null {
  const memo = tx.tx?.body?.memo ?? "";
  if (!memo.startsWith(VOTE_PREFIX)) return null;

  // Split on the LAST ':' so a proposalId is safe even if it contained ':'
  // (txhashes never do, but the bot's codec is defined this way).
  const rest = memo.slice(VOTE_PREFIX.length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon < 0) return null;

  const proposalId = rest.slice(0, lastColon);
  const choice = parseChoiceToken(rest.slice(lastColon + 1));
  if (!proposalId || !choice) return null;

  const voter = senderFromTx(tx);
  if (!voter) return null;

  return {
    proposalId,
    voter,
    choice,
    txHash: tx.txhash,
    height: Number(tx.height),
    timestamp: new Date(tx.timestamp).getTime(),
  };
}

function parseCommentFromTx(
  tx: CosmosTxResponse,
): (CommunityComment & { proposalId: string }) | null {
  const memo = tx.tx?.body?.memo ?? "";
  if (!memo.startsWith(COMMENT_PREFIX)) return null;

  // Split on the FIRST ':' after the prefix: <proposalId>:<base64 body>
  const rest = memo.slice(COMMENT_PREFIX.length);
  const firstColon = rest.indexOf(":");
  if (firstColon < 0) return null;

  const proposalId = rest.slice(0, firstColon);
  const encoded = rest.slice(firstColon + 1);

  let body: string;
  try {
    body = fromBase64Utf8(encoded);
  } catch {
    return null;
  }
  if (!body) return null;

  const author = senderFromTx(tx);
  if (!author) return null;

  return {
    author,
    body,
    txHash: tx.txhash,
    height: Number(tx.height),
    timestamp: new Date(tx.timestamp).getTime(),
    proposalId,
  };
}

/** Labels a proposal tallies against: binary => ["Yes","No"]. */
function labelsFor(p: CommunityProposal): string[] {
  return p.options ?? ["Yes", "No"];
}

/**
 * Match a raw vote to a proposal's shape and return the 0-based option index,
 * or null if the vote shape does not fit (e.g. opt-N on a binary proposal, a
 * yes/no on a multi ballot, or an out-of-range option). Mismatched votes are
 * dropped from the tally rather than mis-counted.
 */
function choiceIndexFor(p: CommunityProposal, choice: ParsedChoice): number | null {
  if (p.options) {
    if (choice.kind !== "option") return null;
    return choice.index < p.options.length ? choice.index : null;
  }
  // binary proposal
  if (choice.kind !== "binary") return null;
  return choice.vote === "yes" ? 0 : 1;
}

/** Collect first-vote-wins voter→index maps for every proposal, oldest first. */
function tallyVotes(
  txs: CosmosTxResponse[],
  proposalsById: Map<string, CommunityProposal>,
): Map<string, Map<string, RawVote>> {
  const byProposal = new Map<string, Map<string, RawVote>>();
  // txs come newest-first; reverse so the FIRST vote a wallet cast wins.
  for (const tx of [...txs].reverse()) {
    const raw = parseVoteFromTx(tx);
    if (!raw) continue;
    const proposal = proposalsById.get(raw.proposalId);
    if (!proposal) continue;
    if (choiceIndexFor(proposal, raw.choice) === null) continue; // shape mismatch
    let byVoter = byProposal.get(raw.proposalId);
    if (!byVoter) {
      byVoter = new Map();
      byProposal.set(raw.proposalId, byVoter);
    }
    if (!byVoter.has(raw.voter)) byVoter.set(raw.voter, raw);
  }
  return byProposal;
}

function buildTally(
  proposal: CommunityProposal,
  byVoter: Map<string, RawVote> | undefined,
  viewer?: string,
): ProposalWithTally {
  const labels = labelsFor(proposal);
  const counts = new Array(labels.length).fill(0);
  let yourChoice: number | null = null;

  if (byVoter) {
    for (const raw of byVoter.values()) {
      const idx = choiceIndexFor(proposal, raw.choice);
      if (idx === null) continue;
      counts[idx] += 1;
      if (viewer && raw.voter === viewer) yourChoice = idx;
    }
  }

  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const binary = proposal.options === null;
  const yesCount = counts[0] ?? 0;
  const noCount = counts[1] ?? 0;

  return {
    ...proposal,
    binary,
    optionLabels: labels,
    optionCounts: counts,
    totalVotes,
    yourChoice,
    yesCount,
    noCount,
    yesVotes: yesCount,
    noVotes: noCount,
    yourVote: binary ? (yourChoice === 0 ? "yes" : yourChoice === 1 ? "no" : null) : null,
  };
}

export async function listProposalsWithTally(
  viewer?: string,
): Promise<ProposalWithTally[]> {
  const txs = await fetchTreasuryTxs(200);

  const proposalsById = new Map<string, CommunityProposal>();
  for (const tx of [...txs].reverse()) {
    const proposal = parseProposalFromTx(tx);
    if (proposal) proposalsById.set(proposal.id, proposal);
  }

  const votes = tallyVotes(txs, proposalsById);

  return [...proposalsById.values()]
    .sort((a, b) => b.height - a.height)
    .map((p) => buildTally(p, votes.get(p.id), viewer));
}

export type ActivityKind = "proposal" | "vote";

export interface ActivityItem {
  kind: ActivityKind;
  txHash: string;
  actor: string;
  height: number;
  timestamp: number;
  proposalId: string;
  proposalTitle: string;
  /** For votes: the chosen option label (e.g. "Yes", "Green"). */
  vote?: string;
}

export async function listRecentActivity(limit = 25): Promise<ActivityItem[]> {
  const txs = await fetchTreasuryTxs(200);

  const proposalsById = new Map<string, CommunityProposal>();
  for (const tx of [...txs].reverse()) {
    const p = parseProposalFromTx(tx);
    if (p) proposalsById.set(p.id, p);
  }

  const out: ActivityItem[] = [];
  for (const tx of txs) {
    const proposal = parseProposalFromTx(tx);
    if (proposal) {
      out.push({
        kind: "proposal",
        txHash: tx.txhash,
        actor: proposal.proposer,
        height: proposal.height,
        timestamp: proposal.timestamp,
        proposalId: proposal.id,
        proposalTitle: proposal.title,
      });
      if (out.length >= limit) break;
      continue;
    }
    const raw = parseVoteFromTx(tx);
    if (raw) {
      const proposal = proposalsById.get(raw.proposalId);
      const idx = proposal ? choiceIndexFor(proposal, raw.choice) : null;
      const label =
        proposal && idx !== null ? labelsFor(proposal)[idx] : undefined;
      out.push({
        kind: "vote",
        txHash: tx.txhash,
        actor: raw.voter,
        height: raw.height,
        timestamp: raw.timestamp,
        proposalId: raw.proposalId,
        proposalTitle: proposal?.title ?? "unknown proposal",
        vote: label,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function getProposalWithVotes(
  id: string,
  viewer?: string,
): Promise<ProposalWithVotes | null> {
  const txs = await fetchTreasuryTxs(300);

  const proposalsById = new Map<string, CommunityProposal>();
  for (const tx of [...txs].reverse()) {
    const p = parseProposalFromTx(tx);
    if (p) proposalsById.set(p.id, p);
  }

  const proposal = proposalsById.get(id);
  if (!proposal) return null;

  const votesByProposal = tallyVotes(txs, proposalsById);
  const byVoter = votesByProposal.get(id);

  const labels = labelsFor(proposal);
  const votes: CommunityVote[] = byVoter
    ? [...byVoter.values()]
        .map((raw) => {
          const idx = choiceIndexFor(proposal, raw.choice)!;
          return {
            voter: raw.voter,
            vote: labels[idx],
            choiceIndex: idx,
            txHash: raw.txHash,
            height: raw.height,
            timestamp: raw.timestamp,
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp)
    : [];

  const commentsByProposal = new Map<string, CommunityComment[]>();
  for (const tx of [...txs].reverse()) {
    const comment = parseCommentFromTx(tx);
    if (comment && comment.proposalId === id) {
      const list = commentsByProposal.get(id) ?? [];
      list.push({
        author: comment.author,
        body: comment.body,
        txHash: comment.txHash,
        height: comment.height,
        timestamp: comment.timestamp,
      });
      commentsByProposal.set(id, list);
    }
  }
  const comments = (commentsByProposal.get(id) ?? []).sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  return { proposal: buildTally(proposal, byVoter, viewer), votes, comments };
}

