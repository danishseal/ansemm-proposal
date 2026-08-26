"use client";

import { useEffect, useRef, useState } from "react";
import { ChatCircle, Copy, Eye, Heart, Repeat, SealCheck, XLogo } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { useProposalDetail, type ProposalComment } from "@/hooks/use-proposals";
import { useWallet } from "@/components/providers/wallet-provider";
import { useQueryClient } from "@tanstack/react-query";

function shortAddress(address: string, head = 8, tail = 6) {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function initialsFromWords(text: string) {
  const words = text
    .split(/\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
  if (words.length === 0) return "BW";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? "B"}${words[1][0] ?? "W"}`.toUpperCase();
}

function tickerFromTitle(value: string) {
  const token = value
    .split(/\s+/)
    .map((v) => v.trim())
    .filter(Boolean)[0];
  if (!token) return "$ANSEM";
  return `$${token.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

function bylineFromTitle(title: string) {
  const words = title
    .split(/\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
  return words.slice(0, 3).join(" ") || "ANSEM Proposal";
}

function suffixFromId(id: string) {
  if (id.length < 3) return "B.00";
  return `${id.slice(0, 1).toUpperCase()}.${id.slice(1, 3).toUpperCase()}`;
}

export function ProposalDetailPage({ id }: { id: string }) {
  const { address } = useWallet();
  const { data, isLoading, error } = useProposalDetail(id, address ?? undefined);
  const [copiedVisible, setCopiedVisible] = useState(false);

  useEffect(() => {
    if (!copiedVisible) return;
    const timer = window.setTimeout(() => setCopiedVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedVisible]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[595px] space-y-5 pb-[100px] pt-6">
        <div className="h-7 w-48 animate-pulse rounded bg-white/80" />
        <div className="h-[130px] animate-pulse rounded-[20px] bg-white/80" />
        <div className="h-24 animate-pulse rounded-[20px] bg-white/80" />
        <div className="h-40 animate-pulse rounded-[20px] bg-white/80" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-[595px] pb-[100px] pt-8 text-center text-sm font-semibold text-[#7f92a6]">
        Unable to load proposal detail.
      </div>
    );
  }

  const { proposal, votes, comments } = data;
  const totalVotes = proposal.totalVotes ?? proposal.yesVotes + proposal.noVotes;
  const yesPercent = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 0;
  const noPercent = totalVotes > 0 ? (proposal.noVotes / totalVotes) * 100 : 0;
  const voteDelta = yesPercent - noPercent;
  const age = formatDistanceToNow(new Date(proposal.createdAt * 1000), { addSuffix: true }).replace("about ", "");
  const ticker = tickerFromTitle(proposal.newSymbol || proposal.newName || proposal.title);
  const initials = initialsFromWords(proposal.title);
  const byline = bylineFromTitle(proposal.title);
  const bylineSuffix = suffixFromId(proposal.id);
  const copyProposalId = async () => {
    await navigator.clipboard.writeText(proposal.id).catch(() => undefined);
    setCopiedVisible(true);
  };

  return (
    <div className="mx-auto w-full max-w-[595px] pb-[100px] pt-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-1 items-center gap-[5px]">
            <p className="truncate text-[18px] font-bold leading-none tracking-[0.18px] text-white">{byline}</p>
            <p className="shrink-0 text-[18px] font-medium leading-none tracking-[0.18px] text-[#788792]">{bylineSuffix}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <div className={`rounded-[6px] px-[5px] py-[1.5px] ${voteDelta >= 0 ? "bg-[#e8fce8]" : "bg-[#ffe9e7]"}`}>
              <p className={`text-[12px] font-semibold uppercase leading-normal ${voteDelta >= 0 ? "text-[#00a65a]" : "text-[#ff3028]"}`}>
                {voteDelta >= 0 ? "+" : ""}{voteDelta.toFixed(2)}%
              </p>
            </div>
            <p className={`text-[16px] font-bold leading-[1.2] uppercase ${voteDelta >= 0 ? "text-[#00a65a]" : "text-[#ff3028]"}`}>
              {compact(totalVotes)} votes
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-[13px] sm:gap-5">
          <div className="relative h-[76px] w-[76px] shrink-0 sm:h-[129px] sm:w-[129px]">
            <div className="absolute inset-0 overflow-hidden rounded-[12px] border-[3px] border-[#00ff7b] p-[2px] sm:rounded-[20px] sm:border-4 sm:p-1">
              <div className="flex h-full w-full items-center justify-center rounded-[8px] bg-[linear-gradient(132deg,#181d26_0%,#3d475a_55%,#4d596e_100%)] text-[24px] font-black tracking-[-0.04em] text-white sm:rounded-[14px] sm:text-[38px]">
                {initials}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[21px] font-bold leading-tight tracking-[0.21px] text-white sm:text-[34px] sm:leading-[1.2]">{proposal.title}</h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                const url =
                  typeof window !== "undefined" ? window.location.href : "";
                const text = `vote on "${proposal.title}" for ansem. ${url}`;
                const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                window.open(intent, "_blank", "noopener,noreferrer");
              }}
              title="Share on X"
              className="flex items-center gap-[6px] rounded-[70px] bg-gradient-to-b from-white to-[#f2f3f6] py-[3px] pl-[10px] pr-[6px] shadow-[0_2px_2px_-1px_rgba(0,0,0,0.06),0_0_0_1px_#e1e4e8] transition hover:shadow-[0_4px_8px_-2px_rgba(0,0,0,0.1),0_0_0_1px_#c8ccd2]"
            >
              <div className="flex items-center gap-1 text-[14px] font-semibold leading-[1.35] text-[#788792]">
                <Heart size={14} weight="fill" />
                <span>{compact(proposal.yesVotes)}</span>
              </div>
              <div className="h-2 w-px rounded-2xl bg-white/15" />
              <div className="flex items-center gap-1 text-[14px] font-semibold leading-[1.35] text-[#788792]">
                <Eye size={14} weight="fill" />
                <span>{compact(totalVotes)}</span>
              </div>
              <div className="h-2 w-px rounded-2xl bg-white/15" />
              <div className="flex items-center gap-1 text-[14px] font-semibold leading-[1.35] text-[#788792]">
                <Repeat size={14} weight="fill" />
                <span>{compact(votes.length)}</span>
              </div>
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black text-white">
                <XLogo size={12} weight="bold" />
              </span>
            </button>
            <p className="text-[14px] font-semibold leading-normal text-[#788792]">{age}</p>
          </div>
        </div>
      </div>

      <div className="mt-[40px] flex flex-col gap-[28px] sm:gap-[40px]">
        <div className="flex flex-col gap-3">
          <h2 className="text-[20px] font-bold leading-[1.3] tracking-[0.3px] text-white">Description</h2>
          <p className="text-[16px] font-medium leading-[1.5] tracking-[0.192px] text-[#5c6f80]">
            {proposal.description || "No summary available for this proposal."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-[20px] font-bold leading-[1.3] tracking-[0.2px] text-white">Related votes</h2>
          <div className="flex flex-col gap-2">
            {votes.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-white/10 bg-white/[0.04] px-4 py-6 text-center text-[13px] font-medium text-[#8fa1b3]">
                No votes yet. Be the first.
              </p>
            ) : (
              votes.slice(0, 15).map((vote) => (
                <VoteRow
                  key={vote.txHash}
                  voter={vote.voter}
                  choice={vote.vote}
                  subject={proposal.title}
                  height={vote.height}
                  timestamp={vote.timestamp}
                  txHash={vote.txHash}
                />
              ))
            )}
          </div>
        </div>

        <VotePanel
          proposalId={proposal.id}
          binary={proposal.binary}
          optionLabels={proposal.optionLabels}
          yourChoice={proposal.yourChoice}
        />

        <CommentsPanel proposalId={proposal.id} comments={comments ?? []} />

        <div className="flex flex-col gap-4">
          <h2 className="text-[20px] font-bold leading-[1.3] tracking-[0.3px] text-white">Stats</h2>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between rounded-[10px] bg-white/[0.05] p-[8px]">
              <p className="text-[16px] font-medium leading-tight tracking-[0.288px] text-[#6f8295]">Votes</p>
              <p className="text-[16px] font-bold leading-[1.2] uppercase text-white tabular-nums"><CountUp value={totalVotes} /></p>
            </div>
            {proposal.optionLabels.map((label, i) => (
              <div
                key={`${label}-${i}`}
                className={`flex items-center justify-between rounded-[10px] p-[8px] ${i % 2 === 1 ? "bg-white/[0.05]" : ""}`}
              >
                <p className="text-[16px] font-medium leading-tight tracking-[0.288px] text-[#6f8295]">{label}</p>
                <p className="text-[16px] font-bold leading-[1.2] text-white tabular-nums"><CountUp value={proposal.optionCounts[i] ?? 0} /></p>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-[10px] p-[8px]">
              <p className="text-[16px] font-medium leading-tight tracking-[0.288px] text-[#6f8295]">Unique voters</p>
              <p className="text-[16px] font-bold leading-[1.2] uppercase text-white tabular-nums"><CountUp value={votes.length} /></p>
            </div>
            <button
              type="button"
              onClick={copyProposalId}
              className="flex w-full items-center justify-between rounded-[10px] p-[8px] text-left transition-opacity hover:opacity-80"
            >
              <p className="text-[16px] font-medium leading-tight tracking-[0.288px] text-[#6f8295]">Proposal ID</p>
              <span className="flex items-center gap-[6px]">
                <p className="text-[16px] font-bold leading-[1.2] text-white">{shortAddress(proposal.id, 6, 4)}</p>
                <Copy size={14} className="text-[#8fa1b3]" />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-5 left-5 z-50">
        <div className={`flex items-center gap-2.5 rounded-[16px] bg-[#07c845] px-3 py-2 text-white shadow-[0_6px_18px_rgba(7,200,69,0.35)] transition-all duration-200 ${copiedVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#141416] text-[#07c845]">
            <SealCheck size={14} weight="fill" />
          </span>
          <span className="text-[13px] font-semibold leading-none">Successfully Copied</span>
        </div>
      </div>
    </div>
  );
}

function CountUp({
  value,
  duration = 700,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (to - from) * eased);
      setDisplay(next);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <>{display}</>;
}

function CommentsPanel({
  proposalId,
  comments,
}: {
  proposalId: string;
  comments: ProposalComment[];
}) {
  const { address, available, connect, connecting, submitComment, commentBodyLimit } = useWallet();
  const queryClient = useQueryClient();
  const limit = commentBodyLimit(proposalId);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = limit - body.length;
  const over = remaining < 0;

  async function send() {
    setError(null);
    setSubmitting(true);
    try {
      await submitComment(proposalId, body);
      setBody("");
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
        void queryClient.invalidateQueries({ queryKey: ["bwick-activity"] });
      }, 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[20px] font-bold leading-[1.3] tracking-[0.3px] text-white">
        Comments{comments.length > 0 ? <span className="ml-2 text-[#8fa1b3] font-semibold">{comments.length}</span> : null}
      </h2>

      {!address ? (
        <p className="text-[13px] text-[#8fa1b3]">
          {available.length === 0 ? (
            "Install ANSEM Wallet or Keplr to comment."
          ) : (
            <>
              <button
                type="button"
                disabled={connecting}
                onClick={() => connect()}
                className="font-semibold text-white underline-offset-2 hover:underline disabled:opacity-60"
              >
                {connecting ? "Connecting…" : "Connect your wallet"}
              </button>
              {" to comment."}
            </>
          )}
        </p>
      ) : (
        <div className="rounded-[16px] border border-white/10 bg-[#141416] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              className="w-full resize-none rounded-[10px] border border-white/10 bg-white/[0.05] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#9cafc4] focus:border-white/20"
            />
            <div className="flex items-center justify-between gap-3">
              <span className={`text-[11px] font-medium ${over ? "text-[#ff3028]" : "text-[#8fa1b3]"}`}>
                {remaining} chars left · 1 CHANSE + gas
              </span>
              <button
                type="button"
                disabled={submitting || body.trim().length === 0 || over}
                onClick={send}
                className="inline-flex h-[34px] items-center rounded-full bg-[#090909] px-4 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)] disabled:opacity-60"
              >
                {submitting ? "Signing…" : "Post"}
              </button>
            </div>
            {error ? (
              <p className="text-[12px] text-[#ff3028]">{error}</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {comments.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-white/10 bg-white/[0.04] px-4 py-6 text-center text-[13px] font-medium text-[#8fa1b3]">
            No comments yet. Be the first.
          </p>
        ) : (
          comments.map((c) => <CommentRow key={c.txHash} comment={c} />)
        )}
      </div>
    </div>
  );
}

function CommentRow({ comment }: { comment: ProposalComment }) {
  const age = formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true }).replace("about ", "");
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-white/10 bg-[#141416] px-3 py-2.5">
      <span
        aria-hidden
        className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-[#ffb13c] via-[#ff5e7a] to-[#7a4cff]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px] leading-[1.3]">
          <a
            href={`https://explorer.ansemchain.fun/account/${comment.author}`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold tracking-tight text-white hover:underline"
          >
            {shortAddress(comment.author, 7, 5)}
          </a>
          <a
            href={`https://explorer.ansemchain.fun/tx/${comment.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-medium text-[#8fa1b3] hover:underline"
          >
            {age}
          </a>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-[1.45] text-[#1f2933]">
          {comment.body}
        </p>
      </div>
    </div>
  );
}

function VoteRow({
  voter,
  choice,
  subject,
  height,
  timestamp,
  txHash,
}: {
  voter: string;
  /** The chosen option label ("Yes"/"No" for binary, else the ballot label). */
  choice: string;
  subject: string;
  height: number;
  timestamp: number;
  txHash: string;
}) {
  const age = formatDistanceToNow(new Date(timestamp), { addSuffix: true }).replace("about ", "");
  const lc = choice.toLowerCase();
  const choiceColor =
    lc === "yes" ? "text-[#00a65a]" : lc === "no" ? "text-[#ff3028]" : "text-[#07c845]";
  return (
    <a
      href={`https://explorer.ansemchain.fun/tx/${txHash}`}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-[12px] border border-white/10 bg-[#141416] px-3 py-2.5 transition hover:border-white/25 hover:bg-white/[0.05]"
    >
      <span
        aria-hidden
        className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-[#6e7bff] via-[#9b5cff] to-[#ff3eaa]"
      />
      <p className="min-w-0 flex-1 truncate text-[14px] leading-[1.3] text-white">
        <span className="font-semibold tracking-tight">
          {shortAddress(voter, 7, 5)}
        </span>
        <span className="text-[#6f8295]"> voted </span>
        <span className={`font-bold ${choiceColor}`}>
          {choice}
        </span>
        <span className="text-[#6f8295]"> on </span>
        <span className="font-bold text-white">&ldquo;{subject}&rdquo;</span>
        <span className="text-[#6f8295]"> at block </span>
        <span className="font-semibold text-white">{height}</span>
      </p>
      <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <p className="whitespace-nowrap text-[13px] font-medium text-[#8fa1b3]">{age}</p>
        <span className="text-[#8fa1b3] transition group-hover:text-[#4a5969]">
          <Eye size={14} weight="bold" />
        </span>
      </span>
    </a>
  );
}

function VotePanel({
  proposalId,
  binary,
  optionLabels,
  yourChoice,
}: {
  proposalId: string;
  binary: boolean;
  optionLabels: string[];
  yourChoice: number | null;
}) {
  const { address, available, connect, castVote, connecting } = useWallet();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function vote(index: number) {
    setError(null);
    setTxHash(null);
    setSubmitting(index);
    try {
      // Binary proposals use literal yes/no tokens; ballots use the 0-indexed
      // option. This is the interop contract with @chanseproposalbot.
      const choice: "yes" | "no" | number = binary
        ? index === 0
          ? "yes"
          : "no"
        : index;
      const hash = await castVote(proposalId, choice);
      setTxHash(hash);
      // The relayer scan needs a few seconds to index the new vote. Force
      // a refetch after a short delay so the tally + yourChoice update.
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
        void queryClient.invalidateQueries({ queryKey: ["bwick-activity"] });
        void queryClient.invalidateQueries({ queryKey: ["proposals"] });
      }, 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(null);
    }
  }

  const binaryColor = (i: number) =>
    i === 0 ? "bg-[#00a65a] hover:bg-[#008e4d]" : "bg-[#ff3028] hover:bg-[#e62820]";

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-[#141416] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <h2 className="text-[20px] font-bold leading-[1.3] tracking-[0.3px] text-white">Vote</h2>
      {!address ? (
        <button
          type="button"
          disabled={connecting || available.length === 0}
          onClick={() => connect()}
          className="inline-flex h-[44px] items-center justify-center rounded-full bg-[#090909] px-6 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)] disabled:opacity-60"
        >
          {available.length === 0
            ? "Install ANSEM Wallet or Keplr"
            : connecting
              ? "Connecting…"
              : "Connect wallet to vote"}
        </button>
      ) : yourChoice !== null ? (
        <div className="rounded-[12px] border border-white/10 bg-white/[0.05] px-4 py-3 text-[14px] font-semibold text-[#6f8295]">
          You voted{" "}
          <span className="text-[#07c845]">{optionLabels[yourChoice] ?? "?"}</span>.
        </div>
      ) : (
        <div className={binary ? "flex gap-2" : "flex flex-col gap-2"}>
          {optionLabels.map((label, i) => (
            <button
              key={`${label}-${i}`}
              type="button"
              disabled={submitting !== null}
              onClick={() => vote(i)}
              className={
                binary
                  ? `flex-1 rounded-full ${binaryColor(i)} px-5 py-3 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition disabled:opacity-60`
                  : "flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.05] px-4 py-3 text-left text-[15px] font-semibold text-white transition hover:border-[#07c845] hover:bg-[#07c845]/15 disabled:opacity-60"
              }
            >
              {binary ? (
                submitting === i ? "Signing…" : `Vote ${label.toUpperCase()}`
              ) : (
                <>
                  <span>{label}</span>
                  <span className="text-[12px] font-medium text-[#6f8295]">
                    {submitting === i ? "Signing…" : "Vote"}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
      {txHash ? (
        <p className="text-[12px] text-[#00a65a]">
          Vote submitted —{" "}
          <a
            href={`https://explorer.ansemchain.fun/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono underline"
          >
            {txHash.slice(0, 12)}…
          </a>
        </p>
      ) : null}
      {error ? (
        <p className="text-[12px] text-[#ff3028]">{error}</p>
      ) : null}
      <p className="text-[11px] text-[#8fa1b3]">
        Voting is a 1 CHANSE transfer to the treasury with the vote in the memo. One vote per wallet per proposal.
      </p>
    </div>
  );
}
