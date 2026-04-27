import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function AdDetailPage() {
  const { id } = useParams();
  const ad = useQuery({ queryKey: ["ad", id], queryFn: () => api.get<any>(`/api/campaigns/ads/${id}`) });

  if (ad.isLoading) return <div className="text-sm text-[var(--color-muted-fg)]">Loading…</div>;
  if (!ad.data) return <div>Ad not found</div>;
  const a = ad.data;

  return (
    <div>
      <Link to="/ads" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 mb-3">
        <ArrowLeft className="h-3 w-3" /> Back to ads
      </Link>
      <h1 className="text-2xl font-semibold">{a.adName}</h1>
      <div className="text-xs text-[var(--color-muted-fg)] mt-1 mb-4 flex flex-wrap gap-2">
        {a.campaignId && (
          <span>Campaign: <Link to={`/campaigns/${a.campaignId}`} className="text-[var(--color-primary)] hover:underline">#{a.campaignId}</Link></span>
        )}
        {a.adsetId && (
          <span>Ad set: <Link to={`/adsets/${a.adsetId}`} className="text-[var(--color-primary)] hover:underline">#{a.adsetId}</Link></span>
        )}
        {a.status && <Badge>{a.status}</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle>Creative & tracking</CardTitle></CardHeader>
        <CardContent>
          <dl className="text-sm grid grid-cols-2 gap-2">
            <dt className="text-[var(--color-muted-fg)]">Platform ad ID</dt>
            <dd><code>{a.platformAdId ?? "—"}</code></dd>
            <dt className="text-[var(--color-muted-fg)]">Creative URL</dt>
            <dd>{a.creativeUrl ? <a href={a.creativeUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline">View</a> : "—"}</dd>
            <dt className="text-[var(--color-muted-fg)]">Headline</dt>
            <dd>{a.headline ?? "—"}</dd>
            <dt className="text-[var(--color-muted-fg)]">CTA</dt>
            <dd>{a.cta ?? "—"}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
