"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "@phosphor-icons/react";
import { useWallet } from "@/components/providers/wallet-provider";
import { encodeProposalMemo } from "@/lib/proposal-codec";

// Must match the chain's max_memo_characters (raised to 2048 via governance).
const MEMO_LIMIT = 2048;
const MAX_OPTIONS = 10;

type Mode = "binary" | "ballot";

export function CreateProposalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#16a34a] px-4 text-[14px] font-bold text-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-white/10 transition hover:bg-[#15803d]"
      >
        <Plus size={16} weight="bold" />
        New proposal
      </button>
      {open ? <CreateProposalModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function CreateProposalModal({ onClose }: { onClose: () => void }) {
  const { address, available, connect, connecting, submitProposal } = useWallet();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("binary");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanOptions = useMemo(
    () => options.map((o) => o.trim()).filter((o) => o.length > 0),
    [options],
  );

  const memoBytes = useMemo(() => {
    const opts = mode === "ballot" && cleanOptions.length >= 2 ? cleanOptions : undefined;
    const memo = encodeProposalMemo(title.trim() || " ", description.trim() || " ", opts);
    return new TextEncoder().encode(memo).length;
  }, [title, description, cleanOptions, mode]);

  const overLimit = memoBytes > MEMO_LIMIT;

  const canSubmit =
    !!address &&
    !submitting &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    (mode === "binary" ||
      (cleanOptions.length >= 2 &&
        cleanOptions.length <= MAX_OPTIONS &&
        cleanOptions.every((o) => o.length <= 60))) &&
    !overLimit;

  function setOption(i: number, v: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }
  function addOption() {
    setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, ""]));
  }
  function removeOption(i: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const opts = mode === "ballot" ? cleanOptions : undefined;
      const hash = await submitProposal(title.trim(), description.trim(), opts);
      setTxHash(hash);
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["proposals"] });
        void queryClient.invalidateQueries({ queryKey: ["bwick-activity"] });
      }, 6000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[24px] border border-white/10 bg-[#0e0e0e] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-white">New proposal</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8f8f8f] transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {txHash ? (
          <div className="mt-5 rounded-[16px] border border-[#6cef4b]/30 bg-[#6cef4b]/10 p-5 text-center">
            <p className="text-[15px] font-semibold text-[#6cef4b]">Proposal submitted.</p>
            <p className="mt-1 break-all font-mono text-[12px] text-[#8f8f8f]">{txHash}</p>
            <p className="mt-2 text-[12px] text-[#b5b5b5]">
              It appears in the feed within a few seconds once the relayer indexes the memo.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 h-10 rounded-full bg-[#6cef4b] px-6 text-[14px] font-bold text-black"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex gap-2">
              <ModeTab label="Yes / No" active={mode === "binary"} onClick={() => setMode("binary")} />
              <ModeTab label="Multi-option ballot" active={mode === "ballot"} onClick={() => setMode("ballot")} />
            </div>

            <label className="mt-5 block text-[13px] font-semibold text-[#b5b5b5]">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are we deciding?"
              className="mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-[#161616] px-4 text-[14px] text-white outline-none placeholder:text-[#6f6f6f] focus:border-[#6cef4b]"
            />

            <label className="mt-4 block text-[13px] font-semibold text-[#b5b5b5]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add the context voters need."
              className="mt-2 w-full resize-none rounded-[12px] border border-white/10 bg-[#161616] px-4 py-3 text-[14px] text-white outline-none placeholder:text-[#6f6f6f] focus:border-[#6cef4b]"
            />

            {mode === "ballot" ? (
              <div className="mt-4">
                <label className="block text-[13px] font-semibold text-[#b5b5b5]">
                  Options ({cleanOptions.length}/{MAX_OPTIONS})
                </label>
                <div className="mt-2 flex flex-col gap-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        maxLength={60}
                        className="h-10 flex-1 rounded-[12px] border border-white/10 bg-[#161616] px-3 text-[14px] text-white outline-none placeholder:text-[#6f6f6f] focus:border-[#6cef4b]"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        disabled={options.length <= 2}
                        className="rounded-full p-2 text-[#8f8f8f] transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                      >
                        <X size={15} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
                {options.length < MAX_OPTIONS ? (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6cef4b] hover:underline"
                  >
                    <Plus size={14} weight="bold" /> Add option
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between text-[12px]">
              <span className={overLimit ? "font-semibold text-[#ff5a52]" : "text-[#6f6f6f]"}>
                Memo {memoBytes}/{MEMO_LIMIT} bytes
              </span>
              <span className="text-[#6f6f6f]">Costs 1 CHANSE to the treasury (anti-spam)</span>
            </div>

            {error ? <p className="mt-3 text-[12px] text-[#ff5a52]">{error}</p> : null}

            <div className="mt-5">
              {!address ? (
                <button
                  type="button"
                  disabled={connecting || available.length === 0}
                  onClick={() => connect()}
                  className="h-11 w-full rounded-full bg-white text-[14px] font-bold text-black disabled:opacity-60"
                >
                  {available.length === 0
                    ? "Install ANSEM Wallet or Keplr"
                    : connecting
                      ? "Connecting…"
                      : "Connect wallet"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submit}
                  className="h-11 w-full rounded-full bg-[#6cef4b] text-[14px] font-bold text-black transition hover:bg-[#5ce03c] disabled:opacity-40"
                >
                  {submitting ? "Signing…" : "Submit proposal"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-[12px] px-3 py-2 text-[13px] font-semibold transition ${
        active
          ? "bg-[#6cef4b] text-black"
          : "border border-white/10 bg-[#161616] text-[#b5b5b5] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
