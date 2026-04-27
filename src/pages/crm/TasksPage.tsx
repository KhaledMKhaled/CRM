import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function TasksPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("Pending");
  const tasks = useQuery({
    queryKey: ["tasks", tab],
    queryFn: () => api.get<any[]>(`/api/tasks?status=${tab}`),
  });
  const completeMut = useMutation({
    mutationFn: (id: number) => api.patch(`/api/tasks/${id}`, { status: "Completed" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div>
      <PageHeader title="Tasks" description="Followups and action items assigned to your team." actions={
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="Pending">Pending</TabsTrigger>
            <TabsTrigger value="Completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      } />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Done</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tasks.data ?? []).map((t) => {
                const overdue = t.status === "Pending" && t.dueDate && new Date(t.dueDate) < new Date();
                return (
                  <TableRow key={t.id} className={overdue ? "bg-[var(--color-danger)]/5" : ""}>
                    <TableCell>
                      {t.status === "Pending" ? (
                        <Button size="icon" variant="ghost" onClick={() => completeMut.mutate(t.id)}><Circle className="h-4 w-4" /></Button>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{t.taskTitle}</TableCell>
                    <TableCell>{t.prospectId ? <Link to={`/leads/${t.prospectId}`} className="text-[var(--color-primary)] hover:underline">{t.prospectName}</Link> : "—"}</TableCell>
                    <TableCell className="text-xs">{t.assignedToName}</TableCell>
                    <TableCell className="text-xs">{t.dueDate ? formatDate(t.dueDate, true) : "—"}{overdue && <Badge variant="danger" className="ml-2">Overdue</Badge>}</TableCell>
                    <TableCell><Badge variant={t.priority === "high" || t.priority === "urgent" ? "danger" : "muted"}>{t.priority}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
