import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, ListChecks } from "lucide-react";
import { formatNumber } from "@shared/calculations";

export default function DataQualityPage() {
  const dq = useQuery({ queryKey: ["dq"], queryFn: () => api.get<any>(`/api/analytics/data-quality`) });
  return (
    <div>
      <PageHeader title="Data quality" description="Detect missing attribution, missing contact info, duplicates, and stale leads." />
      {dq.data && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard label="Total prospects" value={formatNumber(dq.data.total)} icon={<ListChecks className="h-5 w-5" />} tone="info" />
          <StatCard label="Unattributed" value={formatNumber(dq.data.unattributed)} icon={<AlertCircle className="h-5 w-5" />} tone="warn" hint={`${(dq.data.unattributed / dq.data.total * 100).toFixed(1)}%`} />
          <StatCard label="Missing phone" value={formatNumber(dq.data.missingPhone)} icon={<AlertTriangle className="h-5 w-5" />} tone="warn" />
          <StatCard label="Stale (>14d, no activity)" value={formatNumber(dq.data.stale?.length ?? 0)} icon={<AlertCircle className="h-5 w-5" />} tone="danger" />
        </div>
      )}
      <Card>
        <CardHeader><CardTitle>Stale leads needing followup</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Lead</TableHead><TableHead>Stage</TableHead><TableHead>Quality</TableHead><TableHead>Days since activity</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(dq.data?.stale ?? []).slice(0, 30).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell><Link className="text-[var(--color-primary)] hover:underline" to={`/leads/${s.id}`}>{s.fullName}</Link></TableCell>
                  <TableCell>{s.stageName ?? "—"}</TableCell>
                  <TableCell><Badge variant={s.leadQuality === "hot" ? "danger" : "warn"}>{s.leadQuality}</Badge></TableCell>
                  <TableCell><Badge variant="warn">{s.daysSinceActivity}d</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
