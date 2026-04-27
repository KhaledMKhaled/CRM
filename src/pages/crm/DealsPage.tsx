import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@shared/calculations";
import { Briefcase, TrendingUp, Award, Target } from "lucide-react";

export default function DealsPage() {
  const deals = useQuery({ queryKey: ["deals"], queryFn: () => api.get<any[]>(`/api/deals`) });
  const all = deals.data ?? [];
  const won = all.filter((d) => d.dealStatus === "won");
  const lost = all.filter((d) => d.dealStatus === "lost");
  const open = all.filter((d) => d.dealStatus === "open");
  const totalRev = won.reduce((s, d) => s + parseFloat(d.actualRevenue ?? 0), 0);
  const expectedOpen = open.reduce((s, d) => s + parseFloat(d.expectedRevenue ?? 0) * (d.probability ?? 50) / 100, 0);

  return (
    <div>
      <PageHeader title="Deals" description="All deals across the pipeline with revenue, probability, and ownership." />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Open deals" value={formatNumber(open.length)} icon={<Briefcase className="h-5 w-5" />} tone="info" hint={`Pipeline ${formatCurrency(expectedOpen)}`} />
        <StatCard label="Won" value={formatNumber(won.length)} icon={<Award className="h-5 w-5" />} tone="success" hint={`Win rate ${formatPercent(all.length ? won.length / all.length : 0)}`} />
        <StatCard label="Lost" value={formatNumber(lost.length)} icon={<Target className="h-5 w-5" />} tone="danger" />
        <StatCard label="Revenue" value={formatCurrency(totalRev)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Stage / Status</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Prob.</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium max-w-[260px] truncate">{d.dealName}</TableCell>
                  <TableCell>{d.prospectId ? <Link to={`/leads/${d.prospectId}`} className="text-[var(--color-primary)] hover:underline">{d.prospectName}</Link> : "—"}</TableCell>
                  <TableCell>
                    <div className="text-xs">{d.dealStage}</div>
                    <Badge variant={d.dealStatus === "won" ? "success" : d.dealStatus === "lost" ? "danger" : "info"}>{d.dealStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{d.productName ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseFloat(d.expectedRevenue))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(parseFloat(d.actualRevenue))}</TableCell>
                  <TableCell className="text-right">{d.probability}%</TableCell>
                  <TableCell className="text-xs">{d.salesOwnerName ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
