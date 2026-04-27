import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CampaignsPage() {
  const camps = useQuery({ queryKey: ["campaigns"], queryFn: () => api.get<any[]>(`/api/campaigns`) });
  return (
    <div>
      <PageHeader title="Campaigns" description="Marketing campaigns with budgets, dates, and ownership." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(camps.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.campaignName}</TableCell>
                  <TableCell><Badge variant="info">{c.channel}</Badge></TableCell>
                  <TableCell className="text-xs">{c.objective}</TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "success" : "muted"}>{c.status}</Badge></TableCell>
                  <TableCell className="text-xs">{formatDate(c.startDate)}</TableCell>
                  <TableCell className="text-xs">{formatDate(c.endDate)}</TableCell>
                  <TableCell className="text-right">{c.budgetTotal ? new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(parseFloat(c.budgetTotal)) : "—"}</TableCell>
                  <TableCell className="text-xs">{c.ownerName ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
