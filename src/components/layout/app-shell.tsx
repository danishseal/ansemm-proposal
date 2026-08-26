"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isProposalDetail = pathname.startsWith("/proposal/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main
        className="transition-[padding-top] duration-200 ease-out"
        style={{ paddingTop: "calc(92px + var(--search-dropdown-h, 0px))" }}
      >
        <div
          className={isHome || isProposalDetail
            ? "mx-auto w-full max-w-[1180px] px-4 pb-8 pt-2 sm:px-6 lg:px-8"
            : "bento-shell flex items-start gap-4 py-6"}
        >
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </main>
      {!isHome && !isProposalDetail ? (
        <section className="bento-shell mb-4">
          <div className="bento-grid">
            <div className="bento-card col-span-12 sm:col-span-8">
              <h2 className="bento-title text-3xl leading-[0.95] text-black sm:text-4xl">Propose fast. Vote clearly.</h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                ANSEM proposals surface community decisions in one focused governance feed, with live filtering and
                contract-backed voting data.
              </p>
            </div>

            <div className="bento-tile-blue col-span-12 flex min-h-[170px] flex-col justify-between p-5 sm:col-span-4">
              <p className="text-sm font-semibold text-black/60">Proposal Feed</p>
              <p className="font-mono text-4xl font-bold text-black">Live</p>
              <p className="text-xs text-black/70">Contract-backed updates</p>
            </div>

            <div className="bento-card col-span-12 sm:col-span-7">
              <p className="text-sm font-semibold text-foreground">Governance first</p>
              <p className="mt-2 text-sm text-foreground/80">
                The app now focuses on proposal discovery instead of token creation, trading, or swap flows.
              </p>
              <p className="mt-3 text-sm text-foreground/80">
                Proposal status, vote counts, and metadata are read from the same proposal contract shape used by the
                existing HODL proposal app.
              </p>
            </div>

            <div className="bento-tile-pink col-span-12 flex min-h-[170px] flex-col justify-between p-5 sm:col-span-5">
              <p className="text-sm font-semibold text-black/60">Trading</p>
              <p className="font-mono text-4xl font-bold text-black">Off</p>
              <p className="text-xs text-black/70">Trading routes removed</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
