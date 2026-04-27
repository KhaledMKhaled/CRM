import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/StatCard";
import { Target, RefreshCw, Link as LinkIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatNumber, formatPercent } from "@shared/calculations";
import { Link } from "react-router-dom";

interface UnattributedRow {
  id: number;
  fullName: string;
  channel: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  campaignNameSnapshot: string | null;
  adsetNameSnapshot: string | null;
  adNameSnapshot: string | null;
  createdAt: string;
}

export default function AttributionPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<number, { campaignId?: number; adsetId?: number; adId?: number }>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ["attr-summary"],
    queryFn: () => api.get<any>(`/api/analytics/data-quality`),
  });
  const unattributed = useQuery({
    queryKey: ["attr-unattributed"],
    queryFn: () => api.get<UnattributedRow[]>(`/api/analytics/unattributed?limit=100`),
  });
  const camps = useQuery({ queryKey: ["campaigns"], queryFn: () => api.get<any[]>(`/api/campaigns`) });
  const adsets = useQuery({ queryKey: ["adsets"], queryFn: () => api.get<any[]>(`/api/campaigns/adsets`) });
  const adsList = useQuery({ queryKey: ["ads"], queryFn: () => api.get<any[]>(`/api/campaigns/ads`) });

  const reattribute = useMutation({
    mutationFn: () => api.post<any>(`/api/analytics/reattribute`, {}),
    onSuccess: (d) => {
      setFeedback(`Re-attribution complete: ${d.updated ?? 0} prospects newly attributed.`);
      qc.invalidateQueries({ queryKey: ["attr-unattributed"] });
      qc.invalidateQueries({ queryKey: ["attr-summary"] });
    },
    onError: (e: any) => setFeedback(`Error: ${e.message}`),
  });

  const manualMap = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.post<any>(`/api/analytics/attribute/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attr-unattributed"] });
      qc.invalidateQueries({ queryKey: ["attr-summary"] });
    },
  });

  const total = summary.data?.total ?? 0;
  const unattCount = summary.data?.unattributed ?? 0;
  const attRate = total ? (total - unattCount) / total : 0;

  const adsetsByCampaign = new Map<number, any[]>();
  (adsets.data ?? []).forEach((a: any) => {
    if (!adsetsByCampaign.has(a.campaignId)) adsetsByCampaign.set(a.campaignId, []);
    adsetsByCampaign.get(a.campaignId)!.push(a);
  });
  const adsByAdset = new Map<number, any[]>();
  (adsList.data ?? []).forEach((ad: any) => {
    if (!adsByAdset.has(ad.adsetId)) adsByAdset.set(ad.adsetId, []);
    adsByAdset.get(ad.adsetId)!.push(ad);
  });

  return (
    <div>
      <PageHeader
        title="Attribution"
        description="Audit unattributed leads, re-run the priority chain, or manually map leads to campaigns / ad sets / ads."
        actions={
          <Button onClick={() => reattribute.mutate()} disabled={reattribute.isPending} size="sm">
            <RefreshCw className={"h-4 w-4 " + (reattribute.isPending ? "animate-spin" : "")} />
            {reattribute.isPending ? "Re-attributing…" : "Re-run attribution"}
          </Button>
        }
      />

      {feedback && (
        <div className="mb-4 rounded-md bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {feedback}
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total prospects" value={formatNumber(total)} icon={<Target className="h-5 w-5" />} tone="info" />
        <StatCard label="Attributed" value={formatNumber(total - unattCount)} icon={<LinkIcon className="h-5 w-5" />} tone="success" hint={formatPercent(attRate)} />
        <StatCard label="Unattributed" value={formatNumber(unattCount)} icon={<AlertTriangle className="h-5 w-5" />} tone="warn" hint={formatPercent(1 - attRate)} />
        <StatCard label="Showing in queue" value={formatNumber((unattributed.data ?? []).length)} icon={<Target className="h-5 w-5" />} tone="info" hint="Up to 100 most recent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unattributed leads — manual mapping</CardTitle>
          <p className="text-xs text-[var(--color-muted-fg)] mt-1">
            Pick a campaign (and optionally an ad set / ad) for each lead, then click <em>Map</em>.
            The attribution chain (UTM → snapshot → platform IDs) handles most leads automatically — anything still here needs admin review.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>UTM / snapshot</TableHead>
                <TableHead>Map to campaign</TableHead>
                <TableHead>Ad set</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(unattributed.data ?? []).map((row) => {
                const sel = selected[row.id] ?? {};
                const campaignAdsets = sel.campaignId ? adsetsByCampaign.get(sel.campaignId) ?? [] : [];
                const adsetAds = sel.adsetId ? adsByAdset.get(sel.adsetId) ?? [] : [];
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link className="text-[var(--color-primary)] hover:underline font-medium" to={`/leads/${row.id}`}>
                        {row.fullName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{row.channel ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px] space-y-0.5">
                      {row.utmCampaign && <div><span className="text-[var(--color-muted-fg)]">utm:</span> {row.utmCampaign}</div>}
                      {row.campaignNameSnapshot && <div><span className="text-[var(--color-muted-fg)]">snap:</span> {row.campaignNameSnapshot}</div>}
                      {!row.utmCampaign && !row.campaignNameSnapshot && <span className="text-[var(--color-muted-fg)]">—</span>}
                    </TableCell>
                    <TableCell>
                      <select
                        className="w-full rounded-md border border-[var(--color-input)] bg-white text-sm px-2 py-1"
                        value={sel.campaignId ?? ""}
                        onChange={(e) =>
                          setSelected((s) => ({
                            ...s,
                            [row.id]: { campaignId: e.target.value ? parseInt(e.target.value) : undefined },
                          }))
                        }
                      >
                        <option value="">— pick —</option>
                        {(camps.data ?? []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.campaignName}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="w-full rounded-md border border-[var(--color-input)] bg-white text-sm px-2 py-1 disabled:opacity-50"
                        disabled={!sel.campaignId}
                        value={sel.adsetId ?? ""}
                        onChange={(e) =>
                          setSelected((s) => ({
                            ...s,
                            [row.id]: { ...sel, adsetId: e.target.value ? parseInt(e.target.value) : undefined, adId: undefined },
                          }))
                        }
                      >
                        <option value="">—</option>
                        {campaignAdsets.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.adsetName}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="w-full rounded-md border border-[var(--color-input)] bg-white text-sm px-2 py-1 disabled:opacity-50"
                        disabled={!sel.adsetId}
                        value={sel.adId ?? ""}
                        onChange={(e) =>
                          setSelected((s) => ({
                            ...s,
                            [row.id]: { ...sel, adId: e.target.value ? parseInt(e.target.value) : undefined },
                          }))
                        }
                      >
                        <option value="">—</option>
                        {adsetAds.map((ad: any) => (
                          <option key={ad.id} value={ad.id}>{ad.adName}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!sel.campaignId || manualMap.isPending}
                        onClick={() =>
                          manualMap.mutate({
                            id: row.id,
                            payload: {
                              campaignId: sel.campaignId,
                              adsetId: sel.adsetId ?? null,
                              adId: sel.adId ?? null,
                            },
                          })
                        }
                      >
                        Map
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(unattributed.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-[var(--color-muted-fg)] py-6">
                    No unattributed leads. Great work!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
