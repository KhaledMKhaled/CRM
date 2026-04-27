import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  ListChecks,
  UserX,
  Tag,
  Phone,
  Mail,
  Copy,
  Briefcase,
  Clock,
} from "lucide-react";
import { formatNumber } from "@shared/calculations";

interface DQ {
  total: number;
  unattributed: number;
  missingPhone: number;
  missingEmail: number;
  missingOwner: number;
  missingStage: number;
  duplicatePhones: number;
  duplicateEmails: number;
  dealsMissingProduct: number;
  overdueDeals: number;
  stale: any[];
}

export default function DataQualityPage() {
  const dq = useQuery({ queryKey: ["dq"], queryFn: () => api.get<DQ>(`/api/analytics/data-quality`) });
  const d = dq.data;
  const pct = (n: number) => (d && d.total ? `${((n / d.total) * 100).toFixed(1)}%` : "—");

  return (
    <div>
      <PageHeader
        title="Data quality"
        description="Detect missing attribution, contact gaps, duplicates, ownership gaps, and stale leads. Use this list to clean your CRM."
      />
      {d && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-3">
            <StatCard label="Total prospects" value={formatNumber(d.total)} icon={<ListChecks className="h-5 w-5" />} tone="info" />
            <StatCard label="Unattributed" value={formatNumber(d.unattributed)} icon={<AlertCircle className="h-5 w-5" />} tone="warn" hint={pct(d.unattributed)} />
            <StatCard label="Missing phone" value={formatNumber(d.missingPhone)} icon={<Phone className="h-5 w-5" />} tone="warn" hint={pct(d.missingPhone)} />
            <StatCard label="Missing email" value={formatNumber(d.missingEmail)} icon={<Mail className="h-5 w-5" />} tone="warn" hint={pct(d.missingEmail)} />
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-3">
            <StatCard label="No owner assigned" value={formatNumber(d.missingOwner)} icon={<UserX className="h-5 w-5" />} tone="warn" hint={pct(d.missingOwner)} />
            <StatCard label="No stage" value={formatNumber(d.missingStage)} icon={<Tag className="h-5 w-5" />} tone="warn" hint={pct(d.missingStage)} />
            <StatCard label="Duplicate phones" value={formatNumber(d.duplicatePhones)} icon={<Copy className="h-5 w-5" />} tone="danger" hint="phone numbers shared by 2+ leads" />
            <StatCard label="Duplicate emails" value={formatNumber(d.duplicateEmails)} icon={<Copy className="h-5 w-5" />} tone="danger" hint="email addresses shared by 2+ leads" />
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Deals without product" value={formatNumber(d.dealsMissingProduct)} icon={<Briefcase className="h-5 w-5" />} tone="warn" />
            <StatCard label="Overdue open deals" value={formatNumber(d.overdueDeals)} icon={<Clock className="h-5 w-5" />} tone="danger" hint="past expected close date" />
            <StatCard label="Stale (>14d, no activity)" value={formatNumber(d.stale?.length ?? 0)} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" />
            <StatCard label="Healthy prospects" value={formatNumber(Math.max(0, d.total - d.unattributed - d.missingPhone - d.missingOwner))} icon={<ListChecks className="h-5 w-5" />} tone="success" hint="approx. (no overlap dedup)" />
          </div>
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Stale leads needing follow-up</CardTitle>
          <p className="text-xs text-[var(--color-muted-fg)] mt-1">Open prospects with no activity in 14+ days. Open the lead to log an activity or change the stage.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Days since activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(d?.stale ?? []).slice(0, 30).map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link className="text-[var(--color-primary)] hover:underline" to={`/leads/${s.id}`}>{s.fullName}</Link>
                  </TableCell>
                  <TableCell>{s.stageName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.leadQuality === "hot" ? "danger" : "warn"}>{s.leadQuality}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="warn">{s.daysSinceActivity}d</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(d?.stale ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-[var(--color-muted-fg)] py-6">
                    No stale leads. Great work!
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
