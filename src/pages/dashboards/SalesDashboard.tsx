import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Funnel } from "@/components/charts/Funnel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ListChecks, Users, Award, AlarmClock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency, formatNumber, formatPercent } from "@shared/calculations";
import { formatDate } from "@/lib/utils";

export default function SalesDashboard() {
  const { user } = useAuth();
  const leads = useQuery({
    queryKey: ["my-leads"],
    queryFn: () => api.get<any>(`/api/prospects?limit=200`),
  });
  const tasks = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => api.get<any>(`/api/tasks?mine=true&status=Pending`),
  });
  const stages = useQuery({ queryKey: ["stages-dist"], queryFn: () => api.get<any>(`/api/analytics/stages`) });

  const all = leads.data?.rows ?? [];
  const myActive = all.filter((p: any) => !p.wonAt && !p.lostAt);
  const myWon = all.filter((p: any) => p.wonAt);
  const overdue = (tasks.data ?? []).filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date());

  // Compute funnel from my prospects
  const fn = {
    leads: all.length,
    contacted: all.filter((p: any) => p.lastActivityAt).length,
    mql: all.filter((p: any) => p.mqlAt).length,
    sql: all.filter((p: any) => p.sqlAt).length,
    won: myWon.length,
  };

  return (
    <div>
      <PageHeader title={`My pipeline — ${user?.name.split(" ")[0]}`} description="Your assigned leads, today's tasks, and outcomes." />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard label="My active leads" value={formatNumber(myActive.length)} icon={<Users className="h-5 w-5" />} tone="info" />
        <StatCard label="MQLs" value={formatNumber(fn.mql)} icon={<ListChecks className="h-5 w-5" />} tone="default" />
        <StatCard label="SQLs" value={formatNumber(fn.sql)} icon={<Briefcase className="h-5 w-5" />} tone="warn" />
        <StatCard label="Won" value={formatNumber(myWon.length)} icon={<Award className="h-5 w-5" />} tone="success" hint={`Win rate ${formatPercent(fn.leads ? myWon.length / fn.leads : 0)}`} />
        <StatCard label="Overdue tasks" value={formatNumber(overdue.length)} icon={<AlarmClock className="h-5 w-5" />} tone={overdue.length > 0 ? "danger" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>My funnel</CardTitle></CardHeader>
          <CardContent>
            <Funnel
              steps={[
                { label: "Leads", value: fn.leads, color: "hsl(199 89% 48%)" },
                { label: "Contacted", value: fn.contacted, color: "hsl(221 83% 53%)" },
                { label: "MQL", value: fn.mql, color: "hsl(265 85% 58%)" },
                { label: "SQL", value: fn.sql, color: "hsl(38 92% 50%)" },
                { label: "Won", value: fn.won, color: "hsl(142 71% 45%)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Today's tasks</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tasks.data ?? []).slice(0, 12).map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.taskTitle}</TableCell>
                    <TableCell>
                      {t.prospectId ? <Link className="text-[var(--color-primary)] hover:underline" to={`/leads/${t.prospectId}`}>{t.prospectName}</Link> : "—"}
                    </TableCell>
                    <TableCell>{t.dueDate ? formatDate(t.dueDate, true) : "—"}</TableCell>
                    <TableCell><Badge variant={t.priority === "high" || t.priority === "urgent" ? "danger" : "muted"}>{t.priority}</Badge></TableCell>
                  </TableRow>
                ))}
                {!(tasks.data ?? []).length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-[var(--color-muted-fg)] py-8">No pending tasks</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent active leads</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Next followup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myActive.slice(0, 12).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell><Link to={`/leads/${p.id}`} className="font-medium text-[var(--color-primary)] hover:underline">{p.fullName}</Link><div className="text-xs text-[var(--color-muted-fg)]">{p.companyName}</div></TableCell>
                  <TableCell>{p.stageName ? <Badge variant="info">{p.stageName}</Badge> : "—"}</TableCell>
                  <TableCell><Badge variant={p.leadQuality === "hot" ? "danger" : p.leadQuality === "warm" ? "warn" : "muted"}>{p.leadQuality ?? "—"}</Badge></TableCell>
                  <TableCell className="text-xs">{p.channel ?? "—"}</TableCell>
                  <TableCell className="text-xs">{formatDate(p.lastActivityAt, true)}</TableCell>
                  <TableCell className="text-xs">{formatDate(p.nextFollowupAt, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
