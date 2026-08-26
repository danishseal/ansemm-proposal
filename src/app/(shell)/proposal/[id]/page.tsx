import { ProposalDetailPage } from "@/components/proposals/proposal-detail-page";

export default async function ProposalDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProposalDetailPage id={id} />;
}
