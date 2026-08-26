import { NextResponse } from "next/server";
import { listRecentActivity } from "@/lib/bwick-community";

export async function GET() {
  try {
    const items = await listRecentActivity(30);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15" } },
    );
  } catch (error) {
    console.error("Failed to fetch ANSEM activity:", error);
    return NextResponse.json(
      { items: [], error: "Failed to fetch recent ANSEM activity." },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
