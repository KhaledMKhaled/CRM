import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function AuditLogPage() {
  const log = useQuery({ queryKey: ["audit"], queryFn: () => api.get<any[]>(`/api/settings/audit`) });
  return (
    <div>
      <PageHeader title="Audit log" description="Recent record changes across CRM, deals, settings, and imports." />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>ID</TableHead></TableRow></TableHeader>
          <TableBody>
            {(log.data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatDate(a.createdAt, true)}</TableCell>
                <TableCell className="text-xs">{a.userName ?? "system"}</TableCell>
                <TableCell><Badge variant={a.action === "create" ? "success" : a.action === "delete" ? "danger" : "info"}>{a.action}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{a.entityType}</TableCell>
                <TableCell className="text-xs font-mono">{a.entityId}</TableCell>
              </TableRow>
            ))}
            {!log.data?.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-[var(--color-muted-fg)] py-8">No audit entries yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
