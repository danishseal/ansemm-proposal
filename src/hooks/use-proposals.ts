"use client";

import { useQuery } from "@tanstack/react-query";

export interface Proposal {
  id: string;
  type: "general" | "twitter_track" | "token_rename";
  title: string;
  description: string;
  handle: string;
  tokenAddress: string;
  newName: string;
  newSymbol: string;
  proposer: string;
  status: string;
  yesVotes: number;
  noVotes: number;
  /** True for a Yes/No proposal; false for a multi-option ballot. */
  binary: boolean;
  /** null for binary; 2..10 labels for a ballot. */
  options: string[] | null;
  /** Labels used for tallying: binary => ["Yes","No"], else options. */
  optionLabels: string[];
  optionCounts: number[];
  totalVotes: number;
  /** Viewer's chosen option index, or null. */
  yourChoice: number | null;
  createdAt: number;
  yourVote?: "yes" | "no" | null;
}

export interface ProposalVote {
  voter: string;
  /** "yes"/"no" for binary proposals, else the option label. */
  vote: string;
  choiceIndex: number;
  txHash: string;
  height: number;
  timestamp: number;
}

export interface ProposalComment {
  author: string;
  body: string;
  txHash: string;
  height: number;
  timestamp: number;
}

interface ProposalDetailResponse {
  proposal: Proposal;
  votes: ProposalVote[];
  comments: ProposalComment[];
}

interface ProposalsResponse {
  proposals: Proposal[];
}

async function fetchProposals(status?: string): Promise<Proposal[]> {
  const params = status ? `?status=${status}` : "";
  const res = await fetch(`/api/proposals${params}`);
  if (!res.ok) throw new Error("Failed to fetch proposals");
  const data: ProposalsResponse = await res.json();
  return data.proposals;
}

export function useProposals(status?: string) {
  return useQuery({
    queryKey: ["proposals", status],
    queryFn: () => fetchProposals(status),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

async function fetchProposalDetail(
  id: string,
  viewer?: string,
): Promise<ProposalDetailResponse> {
  const qs = viewer ? `?viewer=${encodeURIComponent(viewer)}` : "";
  const res = await fetch(`/api/proposals/${id}${qs}`);
  if (!res.ok) throw new Error("Failed to fetch proposal detail");
  return res.json() as Promise<ProposalDetailResponse>;
}

export function useProposalDetail(id: string, viewer?: string) {
  return useQuery({
    queryKey: ["proposal", id, viewer ?? null],
    queryFn: () => fetchProposalDetail(id, viewer),
    enabled: Boolean(id),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export interface ActivityItem {
  kind: "proposal" | "vote";
  txHash: string;
  actor: string;
  height: number;
  timestamp: number;
  proposalId: string;
  proposalTitle: string;
  vote?: "yes" | "no";
}

async function fetchActivity(): Promise<ActivityItem[]> {
  const res = await fetch("/api/activity");
  if (!res.ok) throw new Error("Failed to fetch activity");
  const data = (await res.json()) as { items: ActivityItem[] };
  return data.items;
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ["bwick-activity"],
    queryFn: fetchActivity,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}
