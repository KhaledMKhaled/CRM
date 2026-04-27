import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import { BarChartCompact } from "@/components/charts/BarChartCompact";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@shared/calculations";
import type { ColumnDef } from "@tanstack/react-table";

const adColumns: ColumnDef<any, any>[] = [
  {
    accessorKey: "adName",
    header: "Ad",
    cell: ({ row }) => (
      <Link to={`/ads/${row.original.id}`} className="text-[var(--color-primary)] hover:underline font-medium">
        {row.original.adName}
      </Link>
    ),
  },
  { accessorKey: "creativeType", header: "Type", cell: ({ getValue }) => getValue() ? <Badge variant="outline">{getValue()}</Badge> : "—" },
  { accessorKey: "headline", header: "Headline", cell: ({ getValue }) => <span className="text-xs text-[var(--color-muted-fg)] max-w-[200px] truncate block">{getValue() ?? "—"}</span> },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <Badge variant={getValue() === "active" ? "success" : "muted"}>{getValue()}</Badge> },
];

export default function AdsetDetailPage() {
  const { id } = useParams();
  const { range, setRange, presets } = useDateRange();

  const adset = useQuery({ queryKey: ["adset", id], queryFn: () => api.get<any>(`/api/campaigns/adsets/${id}`) });
  const ads = useQuery({
    queryKey: ["adset-ads", id],
    queryFn: () => api.get<any[]>(`/api/campaigns/ads?adsetId=${id}`),
  });
  const perf = useQuery({
    queryKey: ["adset-perf", id, range],
    queryFn: () => api.get<any[]>(`/api/meta/daily?from=${range.from}&to=${range.to}`),
  });

  if (adset.isLoading) return <div className="text-sm text-[var(--color-muted-fg)] p-6">Loading…</div>;
  if (!adset.data) return <div className="p-6 text-sm">Ad set not found.</div>;

  const a = adset.data;

  // Aggregate perf for this adset
  const adsetPerf = (perf.data ?? []).filter((r) => String(r.adsetId) === String(id));
  const totSpend = adsetPerf.reduce((s, r) => s + parseFloat(r.amountSpent ?? "0"), 0);
  const totImpr = adsetPerf.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totClicks = adsetPerf.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totConv = adsetPerf.reduce((s, r) => s + (r.messagingConversationsStarted ?? 0), 0);
  const totLeads = adsetPerf.reduce((s, r) => s + (r.metaLeads ?? 0), 0);

  // Daily chart data
  const dailyChart = adsetPerf
    .reduce((acc, r) => {
      const existing = acc.find((x) => x.date === r.date);
      if (existing) {
        existing.spend += parseFloat(r.amountSpent ?? "0");
        existing.conversations += r.messagingConversationsStarted ?? 0;
      } else {
        acc.push({ date: r.date, spend: parseFloat(r.amountSpent ?? "0"), conversations: r.messagingConversationsStarted ?? 0 });
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <Link to="/adsets" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 mb-3">
        <ArrowLeft className="h-3 w-3" /> Back to ad sets
      </Link>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{a.adsetName}</h1>
          <div className="text-xs text-[var(--color-muted-fg)] mt-1 flex flex-wrap gap-3">
            {a.campaignId && (
              <span>Campaign: <Link to={`/campaigns/${a.campaignId}`} className="text-[var(--color-primary)] hover:underline">{a.campaignName ?? `#${a.campaignId}`}</Link></span>
            )}
            {a.status && <Badge variant={a.status === "active" ? "success" : "muted"}>{a.status}</Badge>}
            {a.optimizationGoal && <Badge variant="outline">{a.optimizationGoal}</Badge>}
            {a.audience && <span>Audience: {a.audience}</span>}
            {a.placement && <span>Placement: {a.placement}</span>}
          </div>
        </div>
        <DateRangePicker value={range} onChange={setRange} presets={presets} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Spend", value: formatCurrency(totSpend) },
          { label: "Impressions", value: formatNumber(totImpr) },
          { label: "Clicks", value: formatNumber(totClicks) },
          { label: "CTR", value: formatPercent(totImpr > 0 ? totClicks / totImpr : 0, 2) },
          { label: "Conversations", value: formatNumber(totConv) },
        ].map(({ label, value }) => (
          <Card key={label} className="text-center">
            <CardContent className="p-3">
              <div className="text-xs text-[var(--color-muted-fg)]">{label}</div>
              <div className="text-lg font-bold mt-1">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily trend chart */}
      {dailyChart.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Daily performance</CardTitle></CardHeader>
          <CardContent>
            <BarChartCompact
              data={dailyChart}
              xKey="date"
              bars={[
                { key: "spend", label: "Spend", color: "hsl(199 89% 48%)" },
                { key: "conversations", label: "Conversations", color: "hsl(38 92% 50%)" },
              ]}
              height={220}
            />
          </CardContent>
        </Card>
      )}

      {/* Ads in this ad set */}
      <Card>
        <CardHeader><CardTitle>Ads in this ad set ({ads.data?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            data={ads.data ?? []}
            columns={adColumns}
            searchPlaceholder="Search ads…"
            isLoading={ads.isLoading}
            emptyMessage="No ads found for this ad set."
          />
        </CardContent>
      </Card>
    </div>
  );
}
