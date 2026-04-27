import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function AdsetDetailPage() {
  const { id } = useParams();
  const adset = useQuery({ queryKey: ["adset", id], queryFn: () => api.get<any>(`/api/campaigns/adsets/${id}`) });
  const ads = useQuery({
    queryKey: ["adset-ads", id],
    queryFn: () => api.get<any[]>(`/api/campaigns/ads?adsetId=${id}`),
  });

  if (adset.isLoading) return <div className="text-sm text-[var(--color-muted-fg)]">Loading…</div>;
  if (!adset.data) return <div>Ad set not found</div>;
  const a = adset.data;

  return (
    <div>
      <Link to="/adsets" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 mb-3">
        <ArrowLeft className="h-3 w-3" /> Back to ad sets
      </Link>
      <h1 className="text-2xl font-semibold">{a.adsetName}</h1>
      <div className="text-xs text-[var(--color-muted-fg)] mt-1 mb-4 flex flex-wrap gap-2">
        {a.campaignId && (
          <span>
            Campaign: <Link to={`/campaigns/${a.campaignId}`} className="text-[var(--color-primary)] hover:underline">#{a.campaignId}</Link>
          </span>
        )}
        {a.status && <Badge>{a.status}</Badge>}
        {a.platformAdsetId && <span>Platform ID: <code>{a.platformAdsetId}</code></span>}
      </div>

      <Card>
        <CardHeader><CardTitle>Ads in this ad set</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Platform ID</TableHead></TableRow></TableHeader>
            <TableBody>
              {(ads.data ?? []).map((ad: any) => (
                <TableRow key={ad.id}>
                  <TableCell><Link className="text-[var(--color-primary)] hover:underline" to={`/ads/${ad.id}`}>{ad.adName}</Link></TableCell>
                  <TableCell>{ad.status ?? "—"}</TableCell>
                  <TableCell><code className="text-xs">{ad.platformAdId ?? "—"}</code></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
