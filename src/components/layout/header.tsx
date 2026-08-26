"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, SignOut, X } from "@phosphor-icons/react";
import { FrenzyLogo } from "@/components/layout/frenzy-logo";
import { Input } from "@/components/ui/input";
import { useHomeFeedStore } from "@/stores/home-feed-store";
import { useWallet } from "@/components/providers/wallet-provider";
import { useProposals } from "@/hooks/use-proposals";
import { useRouter } from "next/navigation";
import { useMemo, useLayoutEffect } from "react";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isProposalDetail = pathname.startsWith("/proposal/");
  const [howOpen, setHowOpen] = useState(false);

  const query = useHomeFeedStore((s) => s.query);
  const setQuery = useHomeFeedStore((s) => s.setQuery);
  const { data: allProposals = [] } = useProposals();
  const router = useRouter();

  // Typeahead matches. Empty when query is blank so the dropdown stays
  // collapsed. Capped at 6 so the panel never gets unwieldy.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allProposals
      .filter((p) => {
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.proposer.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [allProposals, query]);
  const showDropdown = query.trim().length > 0 && matches.length > 0;

  // Push the page content down so the dropdown never overlaps the activity
  // ticker / banner below. Approximate the panel height from match count;
  // resets to 0 when the dropdown closes.
  const dropdownPx = showDropdown ? Math.min(matches.length, 6) * 62 + 12 : 0;
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--search-dropdown-h",
      `${dropdownPx}px`,
    );
  }, [dropdownPx]);

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-40 bg-background/95 backdrop-blur-sm">
      <div className="w-full px-5 sm:px-8 lg:px-12">
        <div className="relative flex h-[92px] items-center justify-between gap-4">
          <FrenzyLogo />

          {isHome || isProposalDetail ? (
            <div className="pointer-events-none absolute inset-x-0 hidden justify-center md:flex">
              {/* The search container grows 1.25× wider when the user starts
               *  typing a matching query, so the dropdown has room to show
               *  full proposal titles. Shrinks back when the query clears or
               *  no proposals match. */}
              <div
                className={
                  "pointer-events-auto w-full transition-[max-width] duration-300 ease-out " +
                  (showDropdown ? "max-w-[525px]" : "max-w-[420px]")
                }
              >
                <div className="relative">
                  <MagnifyingGlass
                    size={17}
                    weight="bold"
                    className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#9cafc4]"
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search proposals…"
                    className={
                      "h-12 border border-white/10 bg-[#111111] pl-12 text-[14px] font-semibold text-white shadow-none placeholder:text-[#8f8f8f] focus-visible:border-[#6cef4b] focus-visible:ring-0 transition-[border-radius] duration-200 ease-out " +
                      (showDropdown ? "rounded-t-[22px] rounded-b-none" : "rounded-[22px]")
                    }
                  />

                  {/* Typeahead dropdown — slides in below the search bar when
                   *  there's at least one match. The wrapper stays mounted so
                   *  the open/close transition reverses cleanly. */}
                  <div
                    className={
                      "absolute left-0 right-0 top-full overflow-hidden bg-[#111111] rounded-b-[22px] shadow-[0_12px_30px_rgba(0,0,0,0.4)] origin-top transition-all duration-200 ease-out " +
                      (showDropdown
                        ? "max-h-[480px] opacity-100 translate-y-0 pointer-events-auto"
                        : "max-h-0 opacity-0 -translate-y-1 pointer-events-none")
                    }
                  >
                    <div className="flex flex-col">
                      {matches.map((p) => {
                        const stamp = new Date(p.createdAt * 1000);
                        const ago = formatAgo(stamp);
                        const initials = initialsFromTitle(p.title);
                        return (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              setQuery("");
                              router.push(`/proposal/${encodeURIComponent(p.id)}`);
                            }}
                            className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-white"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[linear-gradient(132deg,#181d26_0%,#3d475a_55%,#4d596e_100%)]">
                              <span className="text-center text-[14px] font-black leading-none tracking-[-0.02em] text-white drop-shadow-[0_2px_1px_rgba(0,0,0,0.28)]">
                                {initials}
                              </span>
                            </span>
                            <span className="flex shrink-0 mt-0.5 h-2 w-2 rounded-full bg-[#ff3028]" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-semibold text-black">
                                {p.title}
                              </span>
                              <span className="block truncate text-[11px] text-[#6c7b85]">
                                <span className="font-semibold text-[#6cef4b]">{p.yesVotes}↑</span>
                                <span className="text-[#9cafc4]"> / </span>
                                <span className="font-semibold text-[#ff3028]">{p.noVotes}↓</span>
                                <span className="text-[#9cafc4]"> · {ago}</span>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex shrink-0 items-center justify-self-end gap-5">
            <div className="mr-2 flex items-center gap-6">
              <a
              href="https://x.com/ansemchainfun/"
                target="_blank"
                rel="noreferrer"
                className="hidden text-[18px] font-bold tracking-[-0.04em] text-[#6cef4b] lg:inline-flex transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-[#a0f58b] hover:drop-shadow-[0_2px_8px_rgba(108,239,75,0.35)]"
              >
                Twitter
              </a>
              <button
                type="button"
                onClick={() => setHowOpen(true)}
                className="hidden text-[18px] font-bold tracking-[-0.04em] text-black lg:inline-flex transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-black/75"
              >
                How it works
              </button>
            </div>
            <SignInControl />
          </div>
        </div>
      </div>
    </header>
    {howOpen ? <HowItWorksModal onClose={() => setHowOpen(false)} /> : null}
    </>
  );
}

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5 backdrop-blur-[8px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[500px] rounded-[28px] border border-[#4aa83b]/35 bg-[#0b0b0b] p-7 text-[#f4f4f4] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-6 top-6 text-white/45 transition hover:text-[#72c968]"
        >
          <X size={16} weight="bold" />
        </button>

        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#72c968]">
          How it works
        </span>

        <h2 className="mt-3 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-white">
          Propose. Vote. Done.
        </h2>

        <ol className="mt-6 flex flex-col gap-4 text-[14px] leading-[21px] text-[#b5b5b5]">
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4aa83b] text-[12px] font-bold text-black">
              1
            </span>
            <span>
              <b className="text-white">Submit a proposal.</b> A title and a
              short description. The submission is a <b>100 CHANSE</b> transfer
              to the community treasury with the text in the memo. The cost
              is the anti spam.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1c1c1c] text-[12px] font-bold text-[#72c968] ring-1 ring-[#4aa83b]/50">
              2
            </span>
            <span>
              <b className="text-white">Holders vote yes or no.</b> Anyone with
              a wallet can vote by signing a <b>1 ubwick</b> transfer. One
              vote per wallet per proposal, first vote wins so the count
              cannot be flipped later.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4aa83b] text-[12px] font-bold text-black">
              3
            </span>
            <span>
              <b className="text-white">Tally is on chain.</b> The site, the
              Telegram bot, and any indexer read the same treasury memos.
              Numbers always agree because there is no off chain counter to
              trust.
            </span>
          </li>
        </ol>

        <p className="mt-6 rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-[12px] leading-[18px] text-[#b5b5b5]">
          <b className="text-white">Heads up.</b> Token proposals (rename,
          image, description, etc.) live inside the launchpad on a
          per token vote, not here. This board is for chain wide ideas.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#4aa83b] text-[15px] font-semibold tracking-[-0.01em] text-white shadow-[0_8px_24px_rgba(74,168,59,0.16)] transition-transform hover:-translate-y-0.5 hover:bg-[#5fbd50]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// Same palette the feed uses, picked deterministically from the proposal id
// so a given proposal's gradient stays consistent across the dropdown and
// the feed row.
const THUMBS = [
  "from-[#ffdf49] via-[#ff8c33] to-[#1d36ff]",
  "from-[#0d1117] via-[#3c465f] to-[#ff6b2b]",
  "from-[#d7eefb] via-[#8b9db8] to-[#1a2433]",
  "from-[#ff6b40] via-[#ffd25a] to-[#ffe3a1]",
  "from-[#112b4d] via-[#6a4cff] to-[#ff4ba0]",
  "from-[#67e8f9] via-[#a78bfa] to-[#fb7185]",
];
function pickThumb(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return THUMBS[h % THUMBS.length];
}

// Initials from the first two words of the title; single-word titles
// collapse to one letter. Strips leading punctuation / $ tickers so a
// proposal like "$INCREASE rate cap" still resolves cleanly.
export function initialsFromTitle(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

function formatAgo(date: Date): string {
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function shortBwick(a: string) {
  if (a.length <= 14) return a;
  return `${a.slice(0, 7)}…${a.slice(-4)}`;
}

function SignInControl() {
  const { address, available, connecting, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (address) {
    return (
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={address}
          aria-expanded={open}
          className="inline-flex h-[50px] shrink-0 items-center gap-2 rounded-full border border-[#d6dde5] bg-white px-5 text-[15px] font-semibold leading-none tracking-[-0.015em] text-black shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5"
        >
            <span className="h-2 w-2 rounded-full bg-[#6cef4b]" />
          <span className="text-[14px] font-semibold tracking-tight text-black">
            {shortBwick(address)}
          </span>
        </button>
        {open ? (
          <div className="absolute right-0 top-[58px] z-50 w-[200px] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
            <div className="border-b border-black/6 px-4 pb-2 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8fa1b3]">
                Connected
              </p>
              <p className="mt-1 truncate text-[13px] font-semibold tracking-tight text-black">
                {shortBwick(address)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                disconnect();
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] font-semibold text-[#ff3028] transition hover:bg-[#fff0ef]"
            >
              <SignOut size={16} weight="bold" />
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    );
  }
  const noWallet = available.length === 0;
  return (
    <button
      type="button"
      disabled={connecting || noWallet}
      onClick={() => connect()}
      className="inline-flex h-[50px] shrink-0 items-center rounded-full border border-[rgba(0,0,0,0.85)] bg-[#090909] px-9 text-[17px] font-semibold leading-none tracking-[-0.015em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
    >
      {connecting ? "Connecting…" : noWallet ? "Install Wallet" : "Sign In"}
    </button>
  );
}
