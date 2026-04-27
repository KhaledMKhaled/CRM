import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatNumber, formatRoas } from "@shared/calculations";

export default function CampaignDetailPage() {
  const { id } = useParams();
  const camp = useQuery({ queryKey: ["camp", id], queryFn: () => api.get<any>(`/api/campaigns/${id}`) });
  const adsets = useQuery({ queryKey: ["camp-adsets", id], queryFn: () => api.get<any[]>(`/api/campaigns/adsets?campaignId=${id}`) });
  const ads = useQuery({ queryKey: ["camp-ads", id], queryFn: () => api.get<any[]>(`/api/campaigns/ads?campaignId=${id}`) });
  const perf = useQuery({ queryKey: ["camp-perf", id], queryFn: () => api.get<any>(`/api/analytics/campaigns?campaignId=${id}`) });

  if (camp.isLoading) return <div className="text-sm text-[var(--color-muted-fg)]">Loading…</div>;
  if (!camp.data) return <div>Campaign not found</div>;
  const c = camp.data;
  const k = (perf.data?.rows ?? []).find((r: any) => r.campaignId === c.id) ?? null;

  return (
    <div>
      <Link to="/campaigns" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 mb-3">
        <ArrowLeft className="h-3 w-3" /> Back to campaigns
      </Link>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{c.campaignName}</h1>
          <div className="text-xs text-[var(--color-muted-fg)] mt-1 flex flex-wrap gap-2">
            <Badge>{c.objective ?? "—"}</Badge>
            <Badge variant="muted">{c.buyingType ?? "—"}</Badge>
            {c.platformCampaignId && <span>Platform ID: <code>{c.platformCampaignId}</code></span>}
            {c.budget != null && <span>Budget: {formatCurrency(Number(c.budget))}</span>}
          </div>
        </div>
      </div>

      {k && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-5">
          <Card><CardContent className="pt-4"><div className="text-xs text-[var(--color-muted-fg)]">Spend</div><div className="text-xl font-semibold">{formatCurrency(k.spend ?? 0)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-[var(--color-muted-fg)]">Leads</div><div className="text-xl font-semibold">{formatNumber(k.leads ?? 0)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-[var(--color-muted-fg)]">Deals won</div><div className="text-xl font-semibold">{formatNumber(k.dealsWon ?? 0)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-[var(--color-muted-fg)]">Revenue</div><div className="text-xl font-semibold">{formatCurrency(k.revenue ?? 0)}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-[var(--color-muted-fg)]">ROAS</div><div className="text-xl font-semibold">{formatRoas(k.roas ?? 0)}</div></CardContent></Card>
        </div>
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle>Ad sets in this campaign</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Platform ID</TableHead></TableRow></TableHeader>
            <TableBody>
              {(adsets.data ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell><Link className="text-[var(--color-primary)] hover:underline" to={`/adsets/${a.id}`}>{a.adsetName}</Link></TableCell>
                  <TableCell>{a.status ?? "—"}</TableCell>
                  <TableCell><code className="text-xs">{a.platformAdsetId ?? "—"}</code></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ads in this campaign</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Ad set</TableHead><TableHead>Platform ID</TableHead></TableRow></TableHeader>
            <TableBody>
              {(ads.data ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell><Link className="text-[var(--color-primary)] hover:underline" to={`/ads/${a.id}`}>{a.adName}</Link></TableCell>
                  <TableCell>{a.adsetName ?? "—"}</TableCell>
                  <TableCell><code className="text-xs">{a.platformAdId ?? "—"}</code></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
