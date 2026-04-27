import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { BarChartCompact } from "@/components/charts/BarChartCompact";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@shared/calculations";
import { DollarSign, MousePointerClick, MessageSquare, Eye, Award, TrendingUp } from "lucide-react";

export default function MediaDashboard() {
  const { range, setRange, presets } = useDateRange();
  const overview = useQuery({ queryKey: ["overview-m", range], queryFn: () => api.get<any>(`/api/analytics/overview?from=${range.from}&to=${range.to}`) });
  const trend = useQuery({ queryKey: ["trend-m", range], queryFn: () => api.get<any>(`/api/analytics/trend?from=${range.from}&to=${range.to}`) });
  const camp = useQuery({ queryKey: ["camp-m", range], queryFn: () => api.get<any>(`/api/analytics/campaigns?from=${range.from}&to=${range.to}`) });
  const ov = overview.data?.overall;

  return (
    <div>
      <PageHeader
        title="Media Buyer Overview"
        description="Spend, performance, and conversion outcomes across your campaigns."
        actions={<DateRangePicker value={range} onChange={setRange} presets={presets} />}
      />
      {ov && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6 mb-6">
          <StatCard label="Spend" value={formatCurrency(ov.spend)} icon={<DollarSign className="h-5 w-5" />} tone="info" />
          <StatCard label="Impressions" value={formatNumber(ov.impressions)} icon={<Eye className="h-5 w-5" />} tone="default" hint={`CPM ${formatCurrency(ov.cpm)}`} />
          <StatCard label="Clicks" value={formatNumber(ov.clicks)} icon={<MousePointerClick className="h-5 w-5" />} tone="info" hint={`CTR ${formatPercent(ov.ctr, 2)} · CPC ${formatCurrency(ov.cpc)}`} />
          <StatCard label="Conversations" value={formatNumber(ov.conversations)} icon={<MessageSquare className="h-5 w-5" />} tone="warn" hint={`${formatPercent(ov.replyRate)} reply rate`} />
          <StatCard label="ROAS" value={formatRoas(ov.roas)} icon={<Award className="h-5 w-5" />} tone="success" />
          <StatCard label="Revenue" value={formatCurrency(ov.revenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" hint={`CPL ${formatCurrency(ov.cpl)}`} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Daily spend & conversations</CardTitle></CardHeader>
          <CardContent>
            {trend.data && (
              <LineTrendChart
                data={trend.data.points}
                xKey="date"
                series={[
                  { key: "spend", label: "Spend", color: "hsl(199 89% 48%)" },
                  { key: "conversations", label: "Conversations", color: "hsl(38 92% 50%)" },
                  { key: "clicks", label: "Clicks", color: "hsl(221 83% 53%)" },
                ]}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Spend per campaign</CardTitle></CardHeader>
          <CardContent>
            {camp.data && (
              <BarChartCompact
                data={camp.data.rows
                  .filter((r: any) => r.spend > 0)
                  .sort((a: any, b: any) => b.spend - a.spend)
                  .slice(0, 6)
                  .map((r: any) => ({ name: r.campaignName.split("—")[1]?.trim() ?? r.campaignName, spend: Math.round(r.spend) }))}
                xKey="name"
                bars={[{ key: "spend", label: "Spend", color: "hsl(199 89% 48%)" }]}
                height={280}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Campaign performance</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Imp.</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">CPL</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {camp.data?.rows.filter((r: any) => r.spend > 0).map((r: any) => (
                <TableRow key={r.campaignId}>
                  <TableCell className="max-w-[260px] truncate font-medium">{r.campaignName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.spend)}</TableCell>
                  <TableCell className="text-right">{formatNumber(r.impressions)}</TableCell>
                  <TableCell className="text-right">{formatNumber(r.clicks)}</TableCell>
                  <TableCell className="text-right">{formatPercent(r.ctr, 2)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.cpc)}</TableCell>
                  <TableCell className="text-right">{formatNumber(r.conversations)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.cpl)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.cac)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatRoas(r.roas)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
