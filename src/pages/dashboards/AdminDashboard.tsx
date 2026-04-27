import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { BarChartCompact } from "@/components/charts/BarChartCompact";
import { Funnel } from "@/components/charts/Funnel";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@shared/calculations";
import { DollarSign, Users, TrendingUp, MousePointerClick, MessageSquare, Target, Award, Briefcase } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboard() {
  const { range, setRange, presets } = useDateRange();
  const overview = useQuery({
    queryKey: ["overview", range],
    queryFn: () => api.get<any>(`/api/analytics/overview?from=${range.from}&to=${range.to}`),
  });
  const trend = useQuery({
    queryKey: ["trend", range],
    queryFn: () => api.get<any>(`/api/analytics/trend?from=${range.from}&to=${range.to}`),
  });
  const camp = useQuery({
    queryKey: ["camp-perf", range],
    queryFn: () => api.get<any>(`/api/analytics/campaigns?from=${range.from}&to=${range.to}`),
  });
  const lb = useQuery({
    queryKey: ["lb", range],
    queryFn: () => api.get<any>(`/api/analytics/leaderboard?from=${range.from}&to=${range.to}`),
  });

  const ov = overview.data?.overall;
  const fn = overview.data?.funnel;

  return (
    <div>
      <PageHeader
        title="Admin Overview"
        description="Real-time CRM performance, marketing attribution, and ROAS for the selected period."
        actions={<DateRangePicker value={range} onChange={setRange} presets={presets} />}
      />

      {ov && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mb-6">
          <StatCard label="Spend (EGP)" value={formatCurrency(ov.spend)} icon={<DollarSign className="h-5 w-5" />} tone="info" />
          <StatCard label="Revenue" value={formatCurrency(ov.revenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" hint={`Profit ${formatCurrency(ov.profit)}`} />
          <StatCard label="ROAS" value={formatRoas(ov.roas)} icon={<Award className="h-5 w-5" />} tone="success" hint={`ROI ${formatPercent(ov.roi)}`} />
          <StatCard label="CPL" value={formatCurrency(ov.cpl)} icon={<Target className="h-5 w-5" />} tone="warn" hint={`CAC ${formatCurrency(ov.cac)}`} />
          <StatCard label="Conversations" value={formatNumber(ov.conversations)} icon={<MessageSquare className="h-5 w-5" />} tone="info" hint={`${formatPercent(ov.replyRate)} reply rate`} />
          <StatCard label="Won deals" value={formatNumber(ov.dealsWon)} icon={<Briefcase className="h-5 w-5" />} tone="success" hint={`Win rate ${formatPercent(ov.dealWinRate)}`} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spend vs. Conversations vs. Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.data && (
              <LineTrendChart
                data={trend.data.points}
                xKey="date"
                series={[
                  { key: "spend", label: "Spend (EGP)", color: "hsl(199 89% 48%)" },
                  { key: "conversations", label: "Conversations", color: "hsl(38 92% 50%)" },
                  { key: "leads", label: "CRM Leads", color: "hsl(142 71% 45%)" },
                ]}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Funnel: Reach → Won</CardTitle>
          </CardHeader>
          <CardContent>
            {fn && (
              <Funnel
                steps={[
                  { label: "Reach", value: fn.reach, color: "hsl(199 89% 48%)" },
                  { label: "Impressions", value: fn.impressions, color: "hsl(199 89% 48%)" },
                  { label: "Clicks", value: fn.clicks, color: "hsl(221 83% 53%)" },
                  { label: "Conversations", value: fn.conversations, color: "hsl(38 92% 50%)" },
                  { label: "CRM Leads", value: fn.leads, color: "hsl(38 92% 50%)" },
                  { label: "MQL", value: fn.mql, color: "hsl(265 85% 58%)" },
                  { label: "SQL", value: fn.sql, color: "hsl(265 85% 58%)" },
                  { label: "Won", value: fn.won, color: "hsl(142 71% 45%)" },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Top campaigns by ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {camp.data?.rows
                    .filter((r: any) => r.spend > 0)
                    .sort((a: any, b: any) => b.roas - a.roas)
                    .slice(0, 8)
                    .map((r: any) => (
                      <TableRow key={r.campaignId}>
                        <TableCell className="max-w-[260px] truncate font-medium">{r.campaignName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.spend)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.crmLeads)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.dealsWon)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRoas(r.roas)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Won</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Win rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lb.data?.rows.slice(0, 8).map((r: any) => (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.won)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                    <TableCell className="text-right">{formatPercent(r.winRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Spend per campaign</CardTitle>
        </CardHeader>
        <CardContent>
          {camp.data && (
            <BarChartCompact
              data={camp.data.rows
                .filter((r: any) => r.spend > 0)
                .sort((a: any, b: any) => b.spend - a.spend)
                .map((r: any) => ({ name: r.campaignName.split("—")[1]?.trim() ?? r.campaignName, spend: Math.round(r.spend), revenue: Math.round(r.revenue) }))}
              xKey="name"
              bars={[
                { key: "spend", label: "Spend", color: "hsl(199 89% 48%)" },
                { key: "revenue", label: "Revenue", color: "hsl(142 71% 45%)" },
              ]}
              height={300}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
