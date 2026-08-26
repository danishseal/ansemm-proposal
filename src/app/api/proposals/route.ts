import { NextResponse } from "next/server";
import { listProposalsWithTally } from "@/lib/bwick-community";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toLowerCase();
  const viewer = searchParams.get("viewer") || undefined;

  try {
    const proposals = (await listProposalsWithTally(viewer))
      .map((proposal) => ({
        id: proposal.id,
        type: "general" as const,
        title: proposal.title,
        description: proposal.description,
        handle: "",
        tokenAddress: "",
        newName: "",
        newSymbol: "",
        proposer: proposal.proposer,
        status: "active",
        yesVotes: proposal.yesCount,
        noVotes: proposal.noCount,
        binary: proposal.binary,
        options: proposal.options,
        optionLabels: proposal.optionLabels,
        optionCounts: proposal.optionCounts,
        totalVotes: proposal.totalVotes,
        yourChoice: proposal.yourChoice,
        createdAt: Math.floor(proposal.timestamp / 1000),
      }))
      .filter((proposal) => !status || status === "all" || proposal.status === status);

    return NextResponse.json(
      { proposals },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json(
      { proposals: [], error: "Failed to fetch ANSEM community proposals." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
