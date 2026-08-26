import { NextResponse } from "next/server";
import { getProposalWithVotes } from "@/lib/bwick-community";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { searchParams } = new URL(request.url);
  const viewer = searchParams.get("viewer") || undefined;
  const { id } = await params;

  try {
    const data = await getProposalWithVotes(id, viewer);
    if (!data) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const proposal = {
      id: data.proposal.id,
      type: "general" as const,
      title: data.proposal.title,
      description: data.proposal.description,
      handle: "",
      tokenAddress: "",
      newName: "",
      newSymbol: "",
      proposer: data.proposal.proposer,
      status: "active",
      yesVotes: data.proposal.yesCount,
      noVotes: data.proposal.noCount,
      binary: data.proposal.binary,
      options: data.proposal.options,
      optionLabels: data.proposal.optionLabels,
      optionCounts: data.proposal.optionCounts,
      totalVotes: data.proposal.totalVotes,
      yourChoice: data.proposal.yourChoice,
      createdAt: Math.floor(data.proposal.timestamp / 1000),
      yourVote: data.proposal.yourVote,
    };

    return NextResponse.json(
      {
        proposal,
        votes: data.votes,
        comments: data.comments,
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("Failed to fetch proposal detail:", error);
    return NextResponse.json({ error: "Failed to fetch proposal detail." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
