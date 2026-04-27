import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function ActivitiesPage() {
  const acts = useQuery({ queryKey: ["activities-all"], queryFn: () => api.get<any[]>(`/api/activities`) });
  return (
    <div>
      <PageHeader title="Activities" description="Most recent calls, messages, and meetings across all leads." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(acts.data ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{formatDate(a.activityDate, true)}</TableCell>
                  <TableCell><Link to={`/leads/${a.prospectId}`} className="text-[var(--color-primary)] hover:underline">{a.prospectName}</Link></TableCell>
                  <TableCell><Badge variant="info">{a.activityType}</Badge></TableCell>
                  <TableCell className="text-xs">{a.activityChannel ?? "—"}</TableCell>
                  <TableCell className="text-xs">{a.activityOutcome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{a.userName}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-[var(--color-muted-fg)]">{a.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
