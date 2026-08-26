"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bird,
  LightbulbFilament,
  MagnifyingGlass,
  Palette,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { useHomeFeedStore } from "@/stores/home-feed-store";
import { type Proposal, useProposals, useActivityFeed, type ActivityItem } from "@/hooks/use-proposals";
import { initialsFromTitle } from "@/components/layout/header";
import { CreateProposalButton } from "@/components/proposals/create-proposal-modal";

const EXPLORER_BASE = "https://explorer.ansemchain.fun";
function explorerAccount(addr: string) {
  return `${EXPLORER_BASE}/account/${addr}`;
}
function shortBwickAddr(a: string) {
  if (!a) return "";
  if (a.length <= 14) return a;
  return `${a.slice(0, 7)}…${a.slice(-4)}`;
}

const proposalThumbs = [
  "from-[#ffdf49] via-[#ff8c33] to-[#1d36ff]",
  "from-[#0d1117] via-[#3c465f] to-[#ff6b2b]",
  "from-[#d7eefb] via-[#8b9db8] to-[#1a2433]",
  "from-[#ff6b40] via-[#ffd25a] to-[#ffe3a1]",
  "from-[#112b4d] via-[#6a4cff] to-[#ff4ba0]",
  "from-[#67e8f9] via-[#a78bfa] to-[#fb7185]",
];

const liveTrendRows = [
  {
    name: "Odyssey",
    subtitle: "Woke Odyssey Memes",
    image: "https://30iqer.s3.us-east-1.amazonaws.com/pump-token-images/0ec6f2cb-0006-485f-bcc0-97f5815bcb8a.jpg",
    creator: "@latinedisce",
    followers: "186.4K",
    price: "$32.82K",
    volume: "$160K",
    ath: "$33K",
    change: "+18.31%",
    positive: true,
  },
  {
    name: "COPIUM",
    subtitle: "Copium",
    image: "https://30iqer.s3.us-east-1.amazonaws.com/pump-token-images/2c0288b6-0f24-4292-b70f-2ecd84f6c906.png",
    creator: "@OwlzzNFA",
    followers: "150",
    price: "$4.91K",
    volume: "$469K",
    ath: "$5K",
    change: "-81.5%",
    positive: false,
  },
  {
    name: "MovieFix",
    subtitle: "AI Movie Fix",
    image: "https://30iqer.s3.us-east-1.amazonaws.com/pump-token-images/473b8935-0efa-49e6-be17-74adfa48044a.jpg",
    creator: "@Rixhabh__",
    followers: "109.2K",
    price: "$11.78K",
    volume: "$304K",
    ath: "$12K",
    change: "-56.74%",
    positive: false,
  },
  {
    name: "WINNIE",
    subtitle: "Xi Winnie",
    image: "https://30iqer.s3.us-east-1.amazonaws.com/pump-token-images/e5c69181-ecbe-43c7-9ceb-f77d260dfb89.webp",
    creator: "@atltaq",
    followers: "72",
    price: "$8.53K",
    volume: "$322K",
    ath: "$9K",
    change: "-68.94%",
    positive: false,
  },
  {
    name: "Tom",
    subtitle: "Tom",
    image: "https://30iqer.s3.us-east-1.amazonaws.com/pump-token-images/24505b97-013e-4dc9-8f9d-f5416f9bf989.jpg",
    creator: "@offlineblitz",
    followers: "N/A",
    price: "$20.07K",
    volume: "$235K",
    ath: "$20K",
    change: "-18.28%",
    positive: false,
  },
];

const typeMeta = {
  general: { label: "Ecosystem", icon: LightbulbFilament },
  twitter_track: { label: "Twitter Track", icon: Bird },
  token_rename: { label: "Token Rename", icon: Palette },
} satisfies Record<Proposal["type"], { label: string; icon: typeof Bird }>;

type FeedTab = "all" | "chain" | "tokens";

const bannerLogoClearRegions = [
  { left: 8, top: 20, size: "lg" },
  { left: 11, top: 69, size: "lg" },
  { left: 24, top: 49, size: "md" },
  { left: 34, top: 29, size: "md" },
  { left: 39, top: 65, size: "lg" },
  { left: 43, top: 60, size: "lg" },
  { left: 47, top: 58, size: "lg" },
  { left: 52, top: 32, size: "sm" },
  { left: 57, top: 20, size: "md" },
  { left: 70, top: 50, size: "md" },
  { left: 83, top: 22, size: "md" },
  { left: 92, top: 34, size: "lg" },
] as const;

const bannerLogoClearRects = [
  { left: 31, top: 20, width: 34, height: 74 },
  { left: 64, top: 45, width: 20, height: 50 },
] as const;

const customBannerLogos = [
  { src: "/fire.png", alt: "Fire", left: "5%", top: "23%", size: "clamp(34px, 7vw, 62px)", tilt: "-8deg", delay: "0s", duration: "2.45s" },
  { src: "/ruby.png", alt: "Ruby", left: "16%", top: "68%", size: "clamp(32px, 6.5vw, 58px)", tilt: "7deg", delay: "0.3s", duration: "3.1s" },
  { src: "/green-arrow.png", alt: "Green arrow", left: "30%", top: "20%", size: "clamp(32px, 6.2vw, 56px)", tilt: "-5deg", delay: "0.65s", duration: "2.7s" },
  { src: "/green-belan.png", alt: "Green belan", left: "71%", top: "69%", size: "clamp(30px, 5.8vw, 52px)", tilt: "-7deg", delay: "0.15s", duration: "3.35s" },
  { src: "/diamond.png", alt: "Diamond", left: "84%", top: "22%", size: "clamp(32px, 6.4vw, 58px)", tilt: "8deg", delay: "0.5s", duration: "2.6s" },
  { src: "/gold.png", alt: "Gold", left: "95%", top: "52%", size: "clamp(34px, 6.8vw, 60px)", tilt: "-6deg", delay: "0.9s", duration: "3s" },
] as const;

// Every memo-based proposal (the treasury system) is a *chain* proposal.
// Token metadata changes live in the launchpad's own per-token vote and
// aren't surfaced here, so the Tokens tab stays empty in this app and
// points users at the launchpad.

export function ProposalFeed() {
  const query = useHomeFeedStore((state) => state.query);
  const setQuery = useHomeFeedStore((state) => state.setQuery);
  const [feedTab, setFeedTab] = useState<FeedTab>("all");
  const { data: proposals = [], isLoading, error } = useProposals();

  const filteredProposals = useMemo(() => {
    if (feedTab === "tokens") return [];
    const normalizedQuery = query.trim().toLowerCase();
    return proposals
      .filter((proposal) => {
        if (!normalizedQuery) return true;
        return [
          proposal.title,
          proposal.description,
          proposal.proposer,
          typeMeta[proposal.type].label,
          proposal.handle,
          proposal.newName,
          proposal.newSymbol,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [proposals, query, feedTab]);

  return (
    <>
    <div className="mx-auto w-full max-w-[724px] pb-16 pt-0">
      <div className="space-y-5">
        <div className="relative md:hidden">
          <MagnifyingGlass size={17} weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9cafc4]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for proposals..."
            className="h-12 w-full rounded-full border border-white/10 bg-[#111111] pl-12 pr-4 text-[14px] font-semibold text-white outline-none placeholder:text-[#8f8f8f] focus:border-[#6cef4b]"
          />
        </div>

        <ActivityTicker />

        <SocialBanner />

        <div className="relative flex items-center justify-between">
          <div className="flex flex-row items-center gap-4">
            <FeedTabButton
              label="All Proposals"
              active={feedTab === "all"}
              onClick={() => setFeedTab("all")}
            />
            <FeedTabButton
              label="Chain Proposals"
              active={feedTab === "chain"}
              onClick={() => setFeedTab("chain")}
            />
            <FeedTabButton
              label="Tokens"
              active={feedTab === "tokens"}
              onClick={() => setFeedTab("tokens")}
            />
          </div>
          <CreateProposalButton />
        </div>

        <section className="pt-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <ProposalSkeleton key={index} />)
          ) : error ? (
            <EmptyState message="Unable to load ANSEM community proposals from the chain REST endpoint." />
          ) : feedTab === "tokens" ? (
            <EmptyState
              message="Token metadata proposals are voted on inside the launchpad, not here. Each token has its own per-field vote."
              cta={{ label: "Open launchpad", href: "https://ansemchain.fun" }}
            />
          ) : filteredProposals.length === 0 ? (
            <EmptyState message="No proposals match your filters." />
          ) : (
            filteredProposals.map((proposal, index) => (
              <ProposalRow key={proposal.id} proposal={proposal} rank={index + 1} />
            ))
          )}
        </section>
      </div>
    </div>
    </>
  );
}

function SocialBanner() {
  const [isSmall, setIsSmall] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [gradientSize, setGradientSize] = useState(0);
  const { RiveComponent, canvas: sourceCanvas, setContainerRef } = useRive({
    src: "/fetch_v2.riv",
    stateMachines: "State Machine 1",
    layout: new Layout({ fit: Fit.Layout, layoutScaleFactor: (isSmall ? 55 : 85) / 100 }),
    autoBind: true,
    autoplay: true,
    onLoad: () => setIsLoaded(true),
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 540px)");
    const update = () => setIsSmall(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => {
      const element = innerRef.current;
      if (!element) return;
      setGradientSize(Math.max(element.offsetWidth, element.offsetHeight) + 50);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const outputCanvas = processedCanvasRef.current;
    if (!sourceCanvas || !outputCanvas || !isLoaded) return;

    const context = outputCanvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    let frameId = 0;

    const paint = () => {
      const width = sourceCanvas.width;
      const height = sourceCanvas.height;

      if (width > 0 && height > 0) {
        if (outputCanvas.width !== width || outputCanvas.height !== height) {
          outputCanvas.width = width;
          outputCanvas.height = height;
        }

        context.clearRect(0, 0, width, height);
        context.drawImage(sourceCanvas, 0, 0, width, height);

        const image = context.getImageData(0, 0, width, height);
        const data = image.data;

        for (let index = 0; index < data.length; index += 4) {
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const alpha = data[index + 3];

          if (alpha === 0) continue;

          const blueDominant = blue > 110 && blue > red + 45 && blue > green + 12;
          const likelyBackground = red < 90 && green < 170;

          if (!blueDominant || !likelyBackground) continue;

          data[index + 3] = 0;
        }

        context.putImageData(image, 0, 0);

        for (const region of bannerLogoClearRegions) {
          const radius = height * (region.size === "lg" ? 0.5 : region.size === "md" ? 0.42 : 0.34);
          const centerX = width * (region.left / 100);
          const centerY = height * (region.top / 100);
          context.clearRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        }

        for (const region of bannerLogoClearRects) {
          context.clearRect(
            width * (region.left / 100),
            height * (region.top / 100),
            width * (region.width / 100),
            height * (region.height / 100),
          );
        }
      }

      frameId = window.requestAnimationFrame(paint);
    };

    frameId = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(frameId);
  }, [isLoaded, sourceCanvas]);

  const borderRadius = isSmall ? 16 : 23;
  const borderWidth = isSmall ? 1.5 : 3;
  const outerRadius = borderRadius + borderWidth;
  const gradientBackground = "conic-gradient(from 0deg, #ff8500 0%, #f900a0 25%, #00d9ff 50%, #00ff88 75%, #ff8500 100%)";

  return (
    <section className="relative overflow-hidden pb-4">
      <div className="relative overflow-hidden" style={{ borderRadius: outerRadius, padding: borderWidth }}>
        <div
          className="pointer-events-none absolute"
          style={{
            left: "50%",
            top: "50%",
            width: gradientSize || 774,
            height: gradientSize || 774,
            marginLeft: -(gradientSize || 774) / 2,
            marginTop: -(gradientSize || 774) / 2,
            background: gradientBackground,
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 500ms ease-out",
            animation: isLoaded ? "frenzy-rainbow-rotate 3s linear infinite" : "none",
          }}
        />
        <div
          ref={(node) => {
            innerRef.current = node;
            setContainerRef(node);
          }}
          className="relative h-[59px] overflow-hidden bg-[#f5e5cf] sm:h-[120px]"
          style={{
            borderRadius,
            backgroundImage: 'url("/IMG_2722.png")',
            backgroundPosition: "center bottom",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        >
          <RiveComponent className="absolute inset-0 h-full w-full opacity-0" />
          <canvas
            ref={processedCanvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ borderRadius }}
          />
          {customBannerLogos.map((logo) => (
            <div
              key={logo.src}
              className="custom-banner-logo pointer-events-none absolute z-10 drop-shadow-[0_8px_14px_rgba(0,0,0,0.22)]"
              style={{
                left: logo.left,
                top: logo.top,
                width: logo.size,
                height: logo.size,
                animationDelay: logo.delay,
                animationDuration: logo.duration,
                transform: `translate(-50%, -50%) rotate(${logo.tilt})`,
              }}
            >
              <Image src={logo.src} alt={logo.alt} fill sizes="64px" className="object-contain" />
            </div>
          ))}
          {!isLoaded ? <div className="absolute inset-0 animate-pulse bg-[#eef4ff]" style={{ borderRadius }} /> : null}
        </div>
      </div>
    </section>
  );
}

function ProposalRow({ proposal, rank }: { proposal: Proposal; rank: number }) {
  const votes = proposal.totalVotes ?? proposal.yesVotes + proposal.noVotes;
  const yesPercent = votes > 0 ? (proposal.yesVotes / votes) * 100 : 0;
  const noPercent = votes > 0 ? (proposal.noVotes / votes) * 100 : 0;
  const timeAgo = formatDistanceToNow(new Date(proposal.createdAt * 1000), { addSuffix: true });
  const ticker = proposal.newSymbol || proposal.newName || typeMeta[proposal.type].label;
  const initials = initialsFromTitle(proposal.title);
  const yesLead = yesPercent - noPercent;
  const address = shortAddress(proposal.proposer).replace("...", "..");

  // Multi-option ballots show their leading option instead of a Yes/No bar.
  const counts = proposal.optionCounts ?? [];
  const leadIdx = counts.length
    ? counts.reduce((best, c, i, arr) => (c > arr[best] ? i : best), 0)
    : 0;
  const leadLabel = proposal.optionLabels?.[leadIdx] ?? "";
  const leadPct = votes > 0 ? ((counts[leadIdx] ?? 0) / votes) * 100 : 0;

  return (
    <Link href={`/proposal/${encodeURIComponent(proposal.id)}`} className="group relative mb-4 flex cursor-pointer rounded-[16px] border-2 border-transparent p-2 transition-colors duration-200 hover:bg-[#151515] sm:rounded-[20px] sm:p-3">
      <div className="flex w-full items-start gap-2 sm:gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          {/* Avatar: deterministic gradient block keyed by rank, with the
              proposal's short ticker. No more borrowed NFT/trend images. */}
          <div className="relative h-[51px] w-[51px] overflow-hidden rounded-[8px] bg-[#f3f6f8] sm:h-[71px] sm:w-[71px]">
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(132deg,#181d26_0%,#3d475a_55%,#4d596e_100%)] text-[20px] font-black leading-none tracking-[-0.02em] text-white sm:text-[28px]">
              <span className="text-center drop-shadow-[0_2px_1px_rgba(0,0,0,0.28)]">{initials}</span>
            </div>
          </div>
          <p className="max-w-[71px] truncate text-[10px] font-medium tracking-[0.119px] text-[#9cafc4] sm:text-[11.915px]">{address}</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1 pb-10 sm:gap-2 md:pb-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[13px] leading-normal">
              <p className="font-bold text-black">{ticker}</p>
              <p className="truncate font-semibold tracking-[0.01em] text-[#687486]">{typeMeta[proposal.type].label}</p>
            </div>
            <h3 className="line-clamp-2 text-[17px] font-bold leading-[135%] tracking-[0.015em] text-black">{proposal.title}</h3>
          </div>

          <div className="flex w-full items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-2 rounded-[70px] border border-black/8 bg-white px-1.5 py-1">
                <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#8b5c3f] text-[8px] leading-[14px] text-white">@</span>
                <span className="font-mono text-[10px] font-semibold leading-[1.3em] text-black">{address}</span>
                <span className="h-[6px] border-l border-black/10" />
                <span className="whitespace-nowrap text-[10px] font-semibold leading-[1.3em] text-[#687486]">
                  <span className="text-black">{votes}</span> votes
                </span>
              </span>
              <div className="flex h-[18px] shrink-0 items-center justify-center rounded-[14px] bg-[rgba(96,128,147,0.09)] px-1.5 pb-[3px] pt-[2px] sm:h-5 sm:px-2">
                <span className="whitespace-nowrap text-right text-[9px] font-semibold leading-normal text-[#6c7b85] sm:text-[10px]">{timeAgo.replace("about ", "")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex h-full shrink-0 flex-col items-end gap-1 sm:gap-1.5">
          {proposal.binary === false ? (
            // Multi-option ballot: leading option + share.
            <div className="flex flex-1 flex-col items-end leading-none">
              <p className="text-[16px] font-medium leading-normal text-[#9cafc4] sm:text-[18px]">
                <span className="font-black text-[#6cef4b]">{leadPct.toFixed(0)}%</span>
              </p>
              <p className="max-w-[140px] truncate text-[13px] font-medium leading-normal text-[#9cafc4] sm:text-[14px]">
                {votes > 0 ? (
                  <span className="font-bold text-black">{leadLabel}</span>
                ) : (
                  <span>no votes</span>
                )}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#687486]">
                {(proposal.optionLabels?.length ?? 0)} options
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col items-end leading-none">
                <p className="text-[16px] font-medium leading-normal text-[#9cafc4] sm:text-[18px]"><span className="font-black text-[#001eff]">{yesPercent.toFixed(0)}%</span></p>
                <p className="text-[13px] font-medium leading-normal text-[#9cafc4] sm:text-[14px]"><span>YES </span><span className="font-bold text-black">{proposal.yesVotes}</span></p>
              </div>
              <div className="mt-15 md:mt-0">
                <div className="absolute bottom-0 right-0 flex items-center gap-3 pb-1 transition-opacity duration-200 md:relative md:gap-1 md:pb-0">
                  <div className="flex items-center gap-1.5">
                    <div className="relative h-[8px] w-[60px] overflow-hidden rounded-[40px] border-[0.5px] border-[#6cef4b] bg-[rgba(108,239,75,0.12)] md:h-[6px] md:w-[84px]">
                      <div className="h-[19px] bg-linear-to-r from-[#43e454] from-[1.442%] via-[#86ed96] via-[56.731%] to-[#43e454]" style={{ width: `${Math.max(4, yesPercent)}%` }} />
                    </div>
                    <p className="whitespace-nowrap text-[12px] font-bold leading-normal md:font-semibold"><span className="text-[#9cafc4]">NO</span><span className="text-black"> {proposal.noVotes}</span></p>
                  </div>
                  <p className={`text-right text-[12px] font-bold leading-normal md:font-semibold ${yesLead >= 0 ? "text-[#6cef4b]" : "text-[#ff3028]"}`}>{yesLead >= 0 ? "+" : ""}{yesLead.toFixed(1)}%</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function AvatarStack({ seed }: { seed: string }) {
  const labels = [seed.slice(0, 2).toUpperCase(), seed.slice(-2).toUpperCase(), "BW"];
  const colors = ["#8b5cf6", "#eab308", "#ec4899"];

  return (
    <div className="hidden items-center gap-[2px] sm:flex">
      <div className="relative h-[18.5px] w-[44px]">
        {labels.map((label, index) => (
          <button key={`${label}-${index}`} type="button" className="absolute h-[18.471px] w-[18.471px] rounded-full border border-white text-[8px] font-semibold text-white shadow-[0_0_0_2px_white] transition-transform duration-200 hover:scale-105" style={{ left: `${index * 11.47}px`, zIndex: 3 - index, backgroundColor: colors[index] }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProposalSkeleton() {
  return <div className="mb-4 h-[98px] animate-pulse rounded-[18px] border border-white/10 bg-[#111111]" />;
}

function EmptyState({
  message,
  cta,
}: {
  message: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-[#111111] px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#edf3ff] text-[#8fa3b8]">
        <MagnifyingGlass size={20} />
      </div>
      <p className="text-sm font-medium text-[#d0d0d0]">{message}</p>
      {cta ? (
        <a
          href={cta.href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#090909] px-5 text-[14px] font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5"
        >
          {cta.label}
        </a>
      ) : null}
    </div>
  );
}

function shortAddress(address: string) {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function ActivityTicker() {
  const { data: items = [] } = useActivityFeed();
  const display = items.slice(0, 3);
  if (display.length === 0) {
    return <div className="flex h-[26px] items-center justify-center text-[11px] text-[#b8b8b8]">No recent activity yet.</div>;
  }
  return (
    <div className="flex items-center justify-center gap-3 overflow-hidden px-0.5">
      {display.map((item, index) => (
        <ActivityChip key={item.txHash} item={item} index={index} />
      ))}
    </div>
  );
}

function ActivityChip({ item, index }: { item: ActivityItem; index: number }) {
  const router = useRouter();
  const isVote = item.kind === "vote";
  const positive = isVote ? item.vote === "yes" : true;
  const actor = shortBwickAddr(item.actor);
  return (
    <div
      onClick={() => router.push(`/proposal/${encodeURIComponent(item.proposalId)}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/proposal/${encodeURIComponent(item.proposalId)}`);
      }}
      className="ticker-live-slot w-[232px] cursor-pointer"
      style={{ ["--slot-delay" as string]: `${index * 0.4}s` }}
    >
      <span className="ticker-live-rainbow" />
      <div className="ticker-live-inner truncate px-[14px] py-[6px] text-[11px] font-medium tracking-[0.02em] text-[#d0d0d0]">
        <a
          href={explorerAccount(item.actor)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-white hover:underline"
        >
          {actor}
        </a>
        <span> </span>
        {isVote ? (
          <>
            <span className={`font-bold uppercase ${positive ? "text-[#6cef4b]" : "text-[#ff3028]"}`}>
              {item.vote?.toUpperCase()}
            </span>
            <span className="text-[#b8b8b8]"> on </span>
          </>
        ) : (
          <>
            <span className="font-bold uppercase text-[#6cef4b]">PROPOSED</span>
            <span className="text-[#b8b8b8]"> </span>
          </>
        )}
        <span className="font-bold text-white">{truncateTitle(item.proposalTitle)}</span>
      </div>
    </div>
  );
}

function truncateTitle(t: string, n = 22) {
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function FeedTabButton({
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
      className="flex flex-row items-center gap-1.5 bg-transparent"
    >
      <span
        className={`text-[18px] transition-[color,font-weight,transform] duration-200 ease-out ${
          active
            ? "font-bold text-[#6cef4b] scale-[1.02]"
            : "font-semibold text-[#a2b3be] hover:text-[#5c6f80]"
        }`}
      >
        {label}
      </span>
      {/* Pulsating dot on whichever tab is currently active. Inactive tabs
       *  drop the dot entirely (opacity + scale to zero) so the previous
       *  tab's marker animates out as the new one animates in. Opacity is
       *  on the inline style so it can't collide with a stale "opacity-30"
       *  Tailwind utility lingering in the cascade. */}
      <span className="relative flex items-center justify-center">
        <span
          aria-hidden
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "9999px",
            background: "#6cef4b",
            position: "absolute",
            opacity: active ? 0.3 : 0,
            transition: "opacity 200ms ease-out",
          }}
          className={active ? "animate-ping" : ""}
        />
        <span
          aria-hidden
          style={{
            width: "5.49px",
            height: "5.49px",
            background: "#ff3028",
            border: "3.06px solid color-mix(in srgb, #ff3028 25%, transparent)",
            borderRadius: "50%",
            flexShrink: 0,
            opacity: active ? 1 : 0,
            transform: active ? "scale(1)" : "scale(0.5)",
            transition: "opacity 200ms ease-out, transform 200ms ease-out",
          }}
        />
      </span>
    </button>
  );
}
