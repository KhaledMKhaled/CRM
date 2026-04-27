import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChartCompact } from "@/components/charts/BarChartCompact";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@shared/calculations";

export default function AdDetailPage() {
  const { id } = useParams();
  const { range, setRange, presets } = useDateRange();

  const ad = useQuery({ queryKey: ["ad", id], queryFn: () => api.get<any>(`/api/campaigns/ads/${id}`) });
  const perf = useQuery({
    queryKey: ["ad-perf", id, range],
    queryFn: () => api.get<any[]>(`/api/meta/daily?from=${range.from}&to=${range.to}`),
  });

  if (ad.isLoading) return <div className="text-sm text-[var(--color-muted-fg)] p-6">Loading…</div>;
  if (!ad.data) return <div className="p-6 text-sm">Ad not found.</div>;
  const a = ad.data;

  // Filter perf rows for this specific ad
  const adPerf = (perf.data ?? []).filter((r) => String(r.adId) === String(id));
  const totSpend = adPerf.reduce((s, r) => s + parseFloat(r.amountSpent ?? "0"), 0);
  const totImpr = adPerf.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const totClicks = adPerf.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totConv = adPerf.reduce((s, r) => s + (r.messagingConversationsStarted ?? 0), 0);
  const totLeads = adPerf.reduce((s, r) => s + (r.metaLeads ?? 0), 0);

  const dailyChart = adPerf
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
      <Link to="/ads" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1 mb-3">
        <ArrowLeft className="h-3 w-3" /> Back to ads
      </Link>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{a.adName}</h1>
          <div className="text-xs text-[var(--color-muted-fg)] mt-1 flex flex-wrap gap-3">
            {a.campaignId && (
              <span>Campaign: <Link to={`/campaigns/${a.campaignId}`} className="text-[var(--color-primary)] hover:underline">{a.campaignName ?? `#${a.campaignId}`}</Link></span>
            )}
            {a.adsetId && (
              <span>Ad Set: <Link to={`/adsets/${a.adsetId}`} className="text-[var(--color-primary)] hover:underline">{a.adsetName ?? `#${a.adsetId}`}</Link></span>
            )}
            {a.status && <Badge variant={a.status === "active" ? "success" : "muted"}>{a.status}</Badge>}
            {a.creativeType && <Badge variant="outline">{a.creativeType}</Badge>}
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Creative brief */}
        <Card>
          <CardHeader><CardTitle>Creative details</CardTitle></CardHeader>
          <CardContent>
            <dl className="text-sm space-y-2">
              {[
                { label: "Creative name", value: a.creativeName },
                { label: "Headline", value: a.headline },
                { label: "Primary text", value: a.primaryText },
                { label: "CTA", value: a.cta },
                { label: "Platform ad ID", value: a.platformAdId },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-2 gap-2 border-b border-[var(--color-border)] pb-2">
                  <dt className="text-[var(--color-muted-fg)]">{label}</dt>
                  <dd className="font-medium truncate">{value ?? "—"}</dd>
                </div>
              ))}
              {a.creativeUrl && (
                <div className="grid grid-cols-2 gap-2">
                  <dt className="text-[var(--color-muted-fg)]">Creative URL</dt>
                  <dd><a href={a.creativeUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline">View creative</a></dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Daily spend chart */}
        {dailyChart.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Daily performance</CardTitle></CardHeader>
            <CardContent>
              <BarChartCompact
                data={dailyChart}
                xKey="date"
                bars={[
                  { key: "spend", label: "Spend (EGP)", color: "hsl(199 89% 48%)" },
                  { key: "conversations", label: "Conversations", color: "hsl(38 92% 50%)" },
                ]}
                height={220}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
