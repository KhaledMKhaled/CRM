import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { downloadCsv } from "@/lib/utils";
import { Download } from "lucide-react";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { BarChartCompact } from "@/components/charts/BarChartCompact";
import { DonutChart } from "@/components/charts/DonutChart";
import { Funnel } from "@/components/charts/Funnel";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@shared/calculations";
import { useState } from "react";

type Bucket = "day" | "week" | "month" | "quarter";

export default function ReportsPage() {
  const { range, setRange, presets } = useDateRange();
  const [bucket, setBucket] = useState<Bucket>("month");

  const camp = useQuery({ queryKey: ["rep-camp", range], queryFn: () => api.get<any>(`/api/analytics/campaigns?from=${range.from}&to=${range.to}`) });
  const trend = useQuery({ queryKey: ["rep-trend", range], queryFn: () => api.get<any>(`/api/analytics/trend?from=${range.from}&to=${range.to}`) });
  const channels = useQuery({ queryKey: ["rep-ch", range], queryFn: () => api.get<any>(`/api/analytics/channels?from=${range.from}&to=${range.to}`) });
  const lb = useQuery({ queryKey: ["rep-lb", range], queryFn: () => api.get<any>(`/api/analytics/leaderboard?from=${range.from}&to=${range.to}`) });
  const overview = useQuery({ queryKey: ["rep-overview", range], queryFn: () => api.get<any>(`/api/analytics/overview?from=${range.from}&to=${range.to}`) });
  const stages = useQuery({ queryKey: ["rep-stages"], queryFn: () => api.get<any>("/api/analytics/stages") });
  const lostR = useQuery({ queryKey: ["rep-lost", range], queryFn: () => api.get<any>(`/api/analytics/lost-reasons?from=${range.from}&to=${range.to}`) });
  const ts = useQuery({ queryKey: ["rep-ts", range, bucket], queryFn: () => api.get<any>(`/api/analytics/timeseries?from=${range.from}&to=${range.to}&bucket=${bucket}`) });

  const filterBar = (
    <div className="flex items-center gap-2 flex-wrap">
      <DateRangePicker value={range} onChange={setRange} presets={presets} />
      <select
        value={bucket}
        onChange={(e) => setBucket(e.target.value as Bucket)}
        className="h-8 border border-[var(--color-border)] rounded-md px-2 text-sm bg-[var(--color-card)]"
      >
        <option value="day">Daily</option>
        <option value="week">Weekly</option>
        <option value="month">Monthly</option>
        <option value="quarter">Quarterly</option>
      </select>
    </div>
  );

  return (
    <div>
      <PageHeader title="Reports" description="Cross-functional performance reports." actions={filterBar} />

      <Tabs defaultValue="timeseries">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="timeseries">Time-period</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign ROAS</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="trend">Daily trend</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="stages">Stage dist.</TabsTrigger>
          <TabsTrigger value="lost">Lost reasons</TabsTrigger>
          <TabsTrigger value="reps">Sales reps</TabsTrigger>
        </TabsList>

        {/* ── Time-period report (bucket) ── */}
        <TabsContent value="timeseries">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{bucket === "day" ? "Daily" : bucket === "week" ? "Weekly" : bucket === "month" ? "Monthly" : "Quarterly"} Performance</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => ts.data && downloadCsv(ts.data.rows, `timeseries-${bucket}-${range.from}-${range.to}.csv`)}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              {ts.data?.rows?.length > 0 && (
                <div className="mb-6">
                  <BarChartCompact
                    data={ts.data.rows.map((r: any) => ({ name: r.period, spend: Math.round(r.spend), revenue: Math.round(r.revenue) }))}
                    xKey="name"
                    bars={[
                      { key: "spend", label: "Spend (EGP)", color: "hsl(199 89% 48%)" },
                      { key: "revenue", label: "Revenue (EGP)", color: "hsl(142 71% 45%)" },
                    ]}
                    height={240}
                  />
                </div>
              )}
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">Replies</TableHead>
                      <TableHead className="text-right">CRM Leads</TableHead>
                      <TableHead className="text-right">MQL</TableHead>
                      <TableHead className="text-right">SQL</TableHead>
                      <TableHead className="text-right">Won</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">CPL</TableHead>
                      <TableHead className="text-right">CAC</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ts.isLoading && (
                      <TableRow><TableCell colSpan={14} className="text-center py-8 text-[var(--color-muted-fg)]">Loading…</TableCell></TableRow>
                    )}
                    {(ts.data?.rows ?? []).map((r: any) => (
                      <TableRow key={r.period}>
                        <TableCell className="font-mono text-xs font-medium">{r.period}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.spend)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.impressions)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.clicks)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.conversations)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.replies)}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(r.crmLeads)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.mql)}</TableCell>
                        <TableCell className="text-right">{formatNumber(r.sql)}</TableCell>
                        <TableCell className="text-right text-[var(--color-success)]">{formatNumber(r.dealsWon)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.cpl)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.cac)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRoas(r.roas)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Campaign ROAS ── */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Campaign performance</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => camp.data && downloadCsv(camp.data.rows, `campaigns-${range.from}-${range.to}.csv`)}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              {camp.data?.rows?.length > 0 && (
                <div className="mb-4">
                  <BarChartCompact
                    data={camp.data.rows.filter((r: any) => r.spend > 0).sort((a: any, b: any) => b.roas - a.roas).slice(0, 8).map((r: any) => ({
                      name: r.campaignName.split("—")[1]?.trim() ?? r.campaignName,
                      roas: Math.round((r.roas ?? 0) * 100) / 100,
                      cac: Math.round(r.cac ?? 0),
                    }))}
                    xKey="name"
                    bars={[{ key: "roas", label: "ROAS ×", color: "hsl(142 71% 45%)" }]}
                    height={200}
                  />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">CRM Leads</TableHead>
                    <TableHead className="text-right">MQL</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead className="text-right">CAC</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(camp.data?.rows ?? []).map((r: any) => (
                    <TableRow key={r.campaignId}>
                      <TableCell className="font-medium max-w-[260px] truncate">{r.campaignName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.spend)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.clicks)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.conversations)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.crmLeads)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.mql)}</TableCell>
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

        {/* ── Channels ── */}
        <TabsContent value="channels">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Leads by channel</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={(channels.data?.rows ?? []).map((r: any) => ({ name: r.channel ?? "Unknown", value: r.leads }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Revenue by channel</CardTitle></CardHeader>
              <CardContent>
                <DonutChart
                  data={(channels.data?.rows ?? []).map((r: any) => ({ name: r.channel ?? "Unknown", value: Math.round(r.revenue) }))}
                />
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle>Channel performance table</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">MQL</TableHead>
                    <TableHead className="text-right">SQL</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Win rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(channels.data?.rows ?? []).map((r: any) => (
                    <TableRow key={r.channel}>
                      <TableCell className="font-medium">{r.channel}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.mql)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.sql)}</TableCell>
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

        {/* ── Daily trend ── */}
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

        {/* ── Funnel ── */}
        <TabsContent value="funnel">
          <Card>
            <CardHeader><CardTitle>Lifecycle funnel</CardTitle></CardHeader>
            <CardContent>
              {overview.data?.funnel && (() => {
                const f = overview.data.funnel as Record<string, number>;
                const steps = [
                  { label: "Reach", value: f.reach, color: "hsl(199 89% 48%)" },
                  { label: "Impressions", value: f.impressions, color: "hsl(199 89% 55%)" },
                  { label: "Clicks", value: f.clicks, color: "hsl(221 83% 53%)" },
                  { label: "Conversations", value: f.conversations, color: "hsl(38 92% 50%)" },
                  { label: "CRM Leads", value: f.leads, color: "hsl(38 92% 44%)" },
                  { label: "MQL", value: f.mql, color: "hsl(265 85% 58%)" },
                  { label: "SQL", value: f.sql, color: "hsl(265 85% 50%)" },
                  { label: "Opportunities", value: f.opportunities, color: "hsl(25 95% 55%)" },
                  { label: "Won", value: f.won, color: "hsl(142 71% 45%)" },
                ];
                return <Funnel steps={steps} />;
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Stage distribution ── */}
        <TabsContent value="stages">
          <Card>
            <CardHeader><CardTitle>Current stage distribution</CardTitle></CardHeader>
            <CardContent className="grid lg:grid-cols-2 gap-6">
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
              <DonutChart data={(stages.data?.rows ?? []).map((r: any) => ({ name: r.stageName ?? "Unknown", value: r.count ?? 0 }))} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lost reasons ── */}
        <TabsContent value="lost">
          <Card>
            <CardHeader><CardTitle>Lost / disqualification reasons</CardTitle></CardHeader>
            <CardContent>
              {lostR.data?.rows?.length > 0 && (
                <div className="mb-4">
                  <BarChartCompact
                    data={(lostR.data?.rows ?? []).map((r: any) => ({ name: r.reasonName, prospects: r.prospects, deals: r.deals }))}
                    xKey="name"
                    bars={[
                      { key: "prospects", label: "Prospects lost", color: "hsl(350 89% 60%)" },
                      { key: "deals", label: "Deals lost", color: "hsl(25 95% 55%)" },
                    ]}
                    height={240}
                  />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Prospects</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lostR.data?.rows ?? []).map((r: any) => (
                    <TableRow key={r.reasonId}>
                      <TableCell className="font-medium">{r.reasonName}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.prospects)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.deals)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNumber(r.prospects + r.deals)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sales reps ── */}
        <TabsContent value="reps">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Sales rep leaderboard</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => lb.data && downloadCsv(lb.data.rows, `reps-${range.from}-${range.to}.csv`)}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">MQL</TableHead>
                    <TableHead className="text-right">SQL</TableHead>
                    <TableHead className="text-right">Activities</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Win rate</TableHead>
                    <TableHead className="text-right">Avg deal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lb.data?.rows ?? []).map((r: any) => (
                    <TableRow key={r.userId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.mql)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.sql)}</TableCell>
                      <TableCell className="text-right">{formatNumber(r.activities)}</TableCell>
                      <TableCell className="text-right text-[var(--color-success)]">{formatNumber(r.won)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.winRate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.won > 0 ? r.revenue / r.won : 0)}</TableCell>
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
