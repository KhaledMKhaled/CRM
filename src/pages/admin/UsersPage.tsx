import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function UsersPage() {
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.get<any[]>(`/api/settings/users`) });
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<{ roles: any[]; allPermissions: string[] }>(`/api/settings/roles`),
  });
  const roleList = rolesQuery.data?.roles ?? [];
  return (
    <div>
      <PageHeader title="Users & Roles" description="Manage team members and role-based permissions." />
      <Tabs defaultValue="users">
        <TabsList><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="roles">Roles & Permissions</TabsTrigger></TabsList>

        <TabsContent value="users">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Team</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {(users.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.roleName ? <Badge variant="info">{u.roleName}</Badge> : <span className="text-[var(--color-muted-fg)]">—</span>}</TableCell>
                    <TableCell>{u.team ?? "—"}</TableCell>
                    <TableCell>{u.status === "active" ? <Badge variant="success">Active</Badge> : <Badge variant="muted">{u.status ?? "Inactive"}</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card><CardContent className="p-4 space-y-4">
            {roleList.map((r: any) => {
              const perms: string[] = Array.isArray(r.permissionsJson) ? r.permissionsJson : [];
              return (
                <div key={r.id} className="border-b pb-3 last:border-0">
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{r.name}</span><Badge variant="muted">{perms.length} permissions</Badge></div>
                  {r.description && <div className="text-xs text-[var(--color-muted-fg)] mb-2">{r.description}</div>}
                  <div className="flex flex-wrap gap-1">
                    {perms.map((p: string) => <Badge key={p} variant="outline" className="!text-[10px] font-mono">{p}</Badge>)}
                  </div>
                </div>
              );
            })}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
