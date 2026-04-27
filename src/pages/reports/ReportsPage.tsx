import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/utils";
import { Download } from "lucide-react";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { BarChartCompact } from "@/components/charts/BarChartCompact";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@shared/calculations";

export default function ReportsPage() {
  const { range, setRange, presets } = useDateRange();
  const camp = useQuery({ queryKey: ["rep-camp", range], queryFn: () => api.get<any>(`/api/analytics/campaigns?from=${range.from}&to=${range.to}`) });
  const trend = useQuery({ queryKey: ["rep-trend", range], queryFn: () => api.get<any>(`/api/analytics/trend?from=${range.from}&to=${range.to}`) });
  const channels = useQuery({ queryKey: ["rep-ch", range], queryFn: () => api.get<any>(`/api/analytics/channels?from=${range.from}&to=${range.to}`) });
  const lb = useQuery({ queryKey: ["rep-lb", range], queryFn: () => api.get<any>(`/api/analytics/leaderboard?from=${range.from}&to=${range.to}`) });
  const overview = useQuery({ queryKey: ["rep-overview", range], queryFn: () => api.get<any>(`/api/analytics/overview?from=${range.from}&to=${range.to}`) });
  const stages = useQuery({ queryKey: ["rep-stages"], queryFn: () => api.get<any>(`/api/analytics/stages`) });

  return (
    <div>
      <PageHeader title="Reports" description="Cross-functional reports for the selected period." actions={<DateRangePicker value={range} onChange={setRange} presets={presets} />} />

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaign ROAS</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="stages">Stage distribution</TabsTrigger>
          <TabsTrigger value="reps">Sales reps</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Campaign performance</CardTitle>
              <Button variant="outline" size="sm" onClick={() => camp.data && downloadCsv(camp.data.rows, `campaigns-${range.from}-${range.to}.csv`)}><Download className="h-4 w-4" /> CSV</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">CRM Leads</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead className="text-right">CAC</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {camp.data?.rows.map((r: any) => (
                    <TableRow key={r.campaignId}>
                      <TableCell className="font-medium max-w-[260px] truncate">{r.campaignName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.spend)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.clicks)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.conversations)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.crmLeads)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.dealsWon)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.cpl)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.cac)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatRoas(r.roas)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.roi)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader><CardTitle>Channel performance</CardTitle></CardHeader>
            <CardContent>
              {channels.data && (
                <BarChartCompact
                  data={channels.data.rows.map((r: any) => ({ name: r.channel, leads: r.leads, won: r.won, revenue: Math.round(r.revenue) }))}
                  xKey="name"
                  bars={[
                    { key: "leads", label: "Leads", color: "hsl(199 89% 48%)" },
                    { key: "won", label: "Won", color: "hsl(142 71% 45%)" },
                  ]}
                  height={240}
                />
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Win rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.data?.rows.map((r: any) => (
                    <TableRow key={r.channel}>
                      <TableCell className="font-medium">{r.channel}</TableCell>
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
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader><CardTitle>Daily trend</CardTitle></CardHeader>
            <CardContent>
              {trend.data && (
                <LineTrendChart
                  data={trend.data.points}
                  xKey="date"
                  series={[
                    { key: "spend", label: "Spend", color: "hsl(199 89% 48%)" },
                    { key: "leads", label: "Leads", color: "hsl(38 92% 50%)" },
                    { key: "won", label: "Won", color: "hsl(142 71% 45%)" },
                    { key: "revenue", label: "Revenue", color: "hsl(265 85% 58%)" },
                  ]}
                  height={360}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel">
          <Card>
            <CardHeader><CardTitle>Lifecycle funnel</CardTitle></CardHeader>
            <CardContent>
              {overview.data?.funnel && (
                <div className="space-y-3">
                  {(() => {
                    const f = overview.data.funnel as Record<string, number>;
                    const stages: { key: string; label: string }[] = [
                      { key: "leads", label: "Leads" },
                      { key: "mql", label: "MQL" },
                      { key: "sql", label: "SQL" },
                      { key: "opportunities", label: "Opportunity" },
                      { key: "won", label: "Won" },
                    ];
                    const top = Math.max(1, ...stages.map((s) => f[s.key] ?? 0));
                    return stages.map((s, i) => {
                      const v = f[s.key] ?? 0;
                      const w = Math.max(2, (v / top) * 100);
                      const prev = i > 0 ? f[stages[i - 1].key] ?? 0 : null;
                      const conv = prev ? (v / prev) * 100 : null;
                      return (
                        <div key={s.key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium">{s.label}</span>
                            <span className="text-[var(--color-muted-fg)]">
                              {formatNumber(v)} {conv != null && <span className="ml-2">→ {conv.toFixed(1)}% conv.</span>}
                            </span>
                          </div>
                          <div className="h-7 bg-[var(--color-muted)] rounded">
                            <div
                              className="h-full rounded bg-[var(--color-primary)] transition-all"
                              style={{ width: `${w}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card>
            <CardHeader><CardTitle>Current stage distribution</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Prospects</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows: any[] = stages.data?.rows ?? [];
                    const total = rows.reduce((s, r) => s + (r.count ?? 0), 0) || 1;
                    return rows.map((r: any) => (
                      <TableRow key={r.stageId ?? r.stageName}>
                        <TableCell className="font-medium">{r.stageName ?? "—"}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.count)}</TableCell>
                        <TableCell className="text-right">{formatPercent((r.count ?? 0) / total)}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reps">
          <Card>
            <CardHeader><CardTitle>Sales rep leaderboard</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Activities</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Win rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lb.data?.rows.map((r: any) => (
                    <TableRow key={r.userId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.activities)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.won)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.winRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
