import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@shared/calculations";
import { formatDate } from "@/lib/utils";

export default function DealDetailPage() {
  const { id } = useParams();
  const deal = useQuery({ queryKey: ["deal", id], queryFn: () => api.get<any>(`/api/deals/${id}`) });

  if (deal.isLoading) return <div className="text-sm text-[var(--color-muted-fg)]">Loading…</div>;
  if (!deal.data) return <div>Deal not found</div>;
  const d = deal.data;
  const status = String(d.dealStatus ?? "open").toLowerCase();
  const tone: "success" | "danger" | "info" = status === "won" ? "success" : status === "lost" ? "danger" : "info";

  return (
    <div>
      <Link to="/deals" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 mb-3">
        <ArrowLeft className="h-3 w-3" /> Back to deals
      </Link>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{d.dealName ?? `Deal #${d.id}`}</h1>
          <div className="text-xs text-[var(--color-muted-fg)] mt-1 flex flex-wrap gap-2">
            <Badge variant={tone}>{status}</Badge>
            {d.dealStage && <Badge variant="muted">{d.dealStage}</Badge>}
            {d.prospectId && (
              <span>
                Lead: <Link className="text-[var(--color-primary)] hover:underline" to={`/leads/${d.prospectId}`}>#{d.prospectId}</Link>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Money</CardTitle></CardHeader>
          <CardContent>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Expected revenue</dt><dd>{formatCurrency(Number(d.expectedRevenue ?? 0))}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Actual revenue</dt><dd>{formatCurrency(Number(d.actualRevenue ?? 0))}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Probability</dt><dd>{d.probability ?? 0}%</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Currency</dt><dd>{d.currency ?? "EGP"}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Created</dt><dd>{formatDate(d.createdAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Expected close</dt><dd>{d.closeDate ? formatDate(d.closeDate) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Won at</dt><dd>{d.wonDate ? formatDate(d.wonDate) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Lost at</dt><dd>{d.lostDate ? formatDate(d.lostDate) : "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Attribution</CardTitle></CardHeader>
          <CardContent>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Campaign</dt><dd>{d.campaignId ? <Link className="text-[var(--color-primary)] hover:underline" to={`/campaigns/${d.campaignId}`}>#{d.campaignId}</Link> : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Ad set</dt><dd>{d.adsetId ? <Link className="text-[var(--color-primary)] hover:underline" to={`/adsets/${d.adsetId}`}>#{d.adsetId}</Link> : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Ad</dt><dd>{d.adId ? <Link className="text-[var(--color-primary)] hover:underline" to={`/ads/${d.adId}`}>#{d.adId}</Link> : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--color-muted-fg)]">Owner</dt><dd>{d.salesOwnerId ? `#${d.salesOwnerId}` : "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>
      {d.notes && (
        <Card className="mt-3">
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{d.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
