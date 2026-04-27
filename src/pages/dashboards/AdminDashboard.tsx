import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { BarChartCompact } from "@/components/charts/BarChartCompact";
import { DonutChart } from "@/components/charts/DonutChart";
import { Funnel } from "@/components/charts/Funnel";
import { formatCurrency, formatNumber, formatPercent, formatRoas } from "@shared/calculations";
import { DollarSign, Users, TrendingUp, MousePointerClick, MessageSquare, Target, Award, Briefcase, AlertCircle, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  const channels = useQuery({
    queryKey: ["channels", range],
    queryFn: () => api.get<any>(`/api/analytics/channels?from=${range.from}&to=${range.to}`),
  });
  const lostR = useQuery({
    queryKey: ["lost-reasons", range],
    queryFn: () => api.get<any>(`/api/analytics/lost-reasons?from=${range.from}&to=${range.to}`),
  });
  const dq = useQuery({
    queryKey: ["data-quality"],
    queryFn: () => api.get<any>("/api/analytics/data-quality"),
  });

  const ov = overview.data?.overall;
  const fn = overview.data?.funnel;
  const campRows: any[] = camp.data?.rows ?? [];
  const chanRows: any[] = channels.data?.rows ?? [];
  const lostRows: any[] = lostR.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        description="Real-time CRM performance, marketing attribution, and ROAS for the selected period."
        actions={<DateRangePicker value={range} onChange={setRange} presets={presets} />}
      />

      {/* ── KPI cards ── */}
      {ov && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Spend (EGP)" value={formatCurrency(ov.spend)} icon={<DollarSign className="h-5 w-5" />} tone="info" />
          <StatCard label="Revenue" value={formatCurrency(ov.revenue)} icon={<TrendingUp className="h-5 w-5" />} tone="success" hint={`Profit ${formatCurrency(ov.profit)}`} />
          <StatCard label="ROAS" value={formatRoas(ov.roas)} icon={<Award className="h-5 w-5" />} tone="success" hint={`ROI ${formatPercent(ov.roi)}`} />
          <StatCard label="CPL" value={formatCurrency(ov.cpl)} icon={<Target className="h-5 w-5" />} tone="warn" hint={`CAC ${formatCurrency(ov.cac)}`} />
          <StatCard label="Conversations" value={formatNumber(ov.conversations)} icon={<MessageSquare className="h-5 w-5" />} tone="info" hint={`${formatPercent(ov.replyRate)} reply rate`} />
          <StatCard label="Won deals" value={formatNumber(ov.dealsWon)} icon={<Briefcase className="h-5 w-5" />} tone="success" hint={`Win rate ${formatPercent(ov.dealWinRate)}`} />
        </div>
      )}

      {/* ── CRM funnel KPI cards ── */}
      {fn && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard label="CRM Leads" value={formatNumber(fn.leads)} icon={<Users className="h-5 w-5" />} tone="info" hint="Entries in CRM" />
          <StatCard label="MQL" value={formatNumber(fn.mql)} icon={<Target className="h-5 w-5" />} tone="info" hint={formatPercent(fn.leads > 0 ? fn.mql / fn.leads : 0) + " of leads"} />
          <StatCard label="SQL" value={formatNumber(fn.sql)} icon={<Target className="h-5 w-5" />} tone="warn" hint={formatPercent(fn.mql > 0 ? fn.sql / fn.mql : 0) + " MQL→SQL"} />
          <StatCard label="Cost per MQL" value={formatCurrency(ov?.costPerMql)} icon={<Target className="h-5 w-5" />} tone="warn" hint={`Cost per SQL ${formatCurrency(ov?.costPerSql)}`} />
        </div>
      )}

      {/* ── Spend vs Conversations trend + Funnel ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Spend vs. Conversations vs. Leads</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Funnel: Reach → Won</CardTitle></CardHeader>
          <CardContent>
            {fn && (
              <Funnel
                steps={[
                  { label: "Reach", value: fn.reach, color: "hsl(199 89% 48%)" },
                  { label: "Clicks", value: fn.clicks, color: "hsl(221 83% 53%)" },
                  { label: "Conversations", value: fn.conversations, color: "hsl(38 92% 50%)" },
                  { label: "CRM Leads", value: fn.leads, color: "hsl(38 92% 44%)" },
                  { label: "MQL", value: fn.mql, color: "hsl(265 85% 58%)" },
                  { label: "SQL", value: fn.sql, color: "hsl(265 85% 50%)" },
                  { label: "Won", value: fn.won, color: "hsl(142 71% 45%)" },
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── ROAS by campaign bar + Channel donut ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>ROAS by campaign</CardTitle></CardHeader>
          <CardContent>
            <BarChartCompact
              data={campRows
                .filter((r) => r.spend > 0)
                .sort((a, b) => b.roas - a.roas)
                .slice(0, 7)
                .map((r) => ({
                  name: r.campaignName.split("—")[1]?.trim() ?? r.campaignName,
                  roas: Math.round((r.roas ?? 0) * 100) / 100,
                }))}
              xKey="name"
              bars={[{ key: "roas", label: "ROAS ×", color: "hsl(142 71% 45%)" }]}
              height={220}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Leads by channel</CardTitle></CardHeader>
          <CardContent>
            <DonutChart
              data={chanRows.map((r) => ({ name: r.channel ?? "Unknown", value: r.leads }))}
              height={220}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Top campaigns by ROAS table + Worst by CAC ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top campaigns by ROAS</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[320px]">
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
                  {campRows
                    .filter((r) => r.spend > 0)
                    .sort((a, b) => b.roas - a.roas)
                    .slice(0, 8)
                    .map((r) => (
                      <TableRow key={r.campaignId}>
                        <TableCell className="max-w-[240px] truncate font-medium text-sm">{r.campaignName}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(r.spend)}</TableCell>
                        <TableCell className="text-right text-xs">{formatNumber(r.crmLeads)}</TableCell>
                        <TableCell className="text-right text-xs">{formatNumber(r.dealsWon)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(r.revenue)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatRoas(r.roas)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Worst campaigns by CAC</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[320px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">CAC</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campRows
                    .filter((r) => r.spend > 0 && r.cac > 0)
                    .sort((a, b) => b.cac - a.cac)
                    .slice(0, 8)
                    .map((r) => (
                      <TableRow key={r.campaignId}>
                        <TableCell className="max-w-[240px] truncate font-medium text-sm">{r.campaignName}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(r.spend)}</TableCell>
                        <TableCell className="text-right text-xs">{formatNumber(r.dealsWon)}</TableCell>
                        <TableCell className="text-right font-semibold text-[var(--color-danger)]">{formatCurrency(r.cac)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(r.cpl)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Lost reasons + Sales Leaderboard ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Lost / disqualification reasons</CardTitle></CardHeader>
          <CardContent>
            {lostRows.length > 0 && (
              <BarChartCompact
                data={lostRows.slice(0, 7).map((r) => ({ name: r.reasonName, prospects: r.prospects, deals: r.deals }))}
                xKey="name"
                bars={[
                  { key: "prospects", label: "Prospects", color: "hsl(350 89% 60%)" },
                  { key: "deals", label: "Deals", color: "hsl(25 95% 55%)" },
                ]}
                height={220}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sales leaderboard</CardTitle></CardHeader>
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
                {(lb.data?.rows ?? []).slice(0, 8).map((r: any) => (
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

      {/* ── Data Quality alert bar ── */}
      {dq.data && (dq.data.unattributed > 0 || dq.data.duplicatePhones > 0 || dq.data.overdueDeals > 0) && (
        <Card className="border-[var(--color-warn)]/40 bg-[var(--color-warn)]/5">
          <CardHeader className="flex-row items-center gap-3 pb-2">
            <AlertTriangle className="h-5 w-5 text-[var(--color-warn)]" />
            <CardTitle className="text-base text-[var(--color-warn)]">Data quality alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 text-sm">
              {dq.data.unattributed > 0 && <Badge variant="warn">{formatNumber(dq.data.unattributed)} unattributed leads</Badge>}
              {dq.data.duplicatePhones > 0 && <Badge variant="warn">{formatNumber(dq.data.duplicatePhones)} duplicate phone sets</Badge>}
              {dq.data.duplicateEmails > 0 && <Badge variant="warn">{formatNumber(dq.data.duplicateEmails)} duplicate email sets</Badge>}
              {dq.data.overdueDeals > 0 && <Badge variant="danger">{formatNumber(dq.data.overdueDeals)} overdue deals</Badge>}
              {dq.data.missingOwner > 0 && <Badge variant="warn">{formatNumber(dq.data.missingOwner)} leads without owner</Badge>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
