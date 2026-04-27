import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Download, Users } from "lucide-react";
import { downloadCsv, formatDate } from "@/lib/utils";
import { PERMISSIONS } from "@shared/permissions";

export default function LeadsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [open, setOpen] = useState(false);

  const stages = useQuery({ queryKey: ["lead-stages"], queryFn: () => api.get<any[]>(`/api/settings/lead-stages`) });
  const channels = useQuery({ queryKey: ["channels"], queryFn: () => api.get<any[]>(`/api/settings/channels`) });
  const sales = useQuery({ queryKey: ["users-sales"], queryFn: () => api.get<any[]>(`/api/settings/users`).catch(() => []) });

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (stageId) p.set("stageId", stageId);
    if (channel) p.set("channel", channel);
    p.set("limit", "100");
    return p.toString();
  }, [q, stageId, channel]);

  const leads = useQuery({
    queryKey: ["leads", params],
    queryFn: () => api.get<any>(`/api/prospects?${params}`),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.post(`/api/prospects`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setOpen(false); },
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="All prospects with attribution, stage, and ownership."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => leads.data && downloadCsv(leads.data.rows, `leads-${Date.now()}.csv`)}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {hasPermission(PERMISSIONS.LEADS_CREATE) && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New Lead</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Lead</DialogTitle></DialogHeader>
                  <NewLeadForm
                    stages={stages.data ?? []}
                    channels={channels.data ?? []}
                    salesUsers={sales.data ?? []}
                    onSubmit={(d) => createMut.mutate(d)}
                    submitting={createMut.isPending}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-[var(--color-muted-fg)]" />
              <Input placeholder="Search name, phone, email, company…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
            </div>
            <NativeSelect value={stageId} onChange={(e) => setStageId(e.target.value)}>
              <option value="">All stages</option>
              {(stages.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.stageName}</option>)}
            </NativeSelect>
            <NativeSelect value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">All channels</option>
              {(channels.data ?? []).map((c) => <option key={c.id} value={c.channelName}>{c.channelName}</option>)}
            </NativeSelect>
            <div className="text-xs text-[var(--color-muted-fg)] flex items-center gap-2"><Users className="h-4 w-4" /> {leads.data?.total ?? 0} leads matching</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name / Company</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Channel / Campaign</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leads.data?.rows ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.prospectCode}</TableCell>
                  <TableCell>
                    <Link className="font-medium text-[var(--color-primary)] hover:underline" to={`/leads/${p.id}`}>{p.fullName}</Link>
                    <div className="text-xs text-[var(--color-muted-fg)]">{p.companyName ?? p.email ?? p.phone}</div>
                  </TableCell>
                  <TableCell>{p.stageName ? <Badge variant="info">{p.stageName}</Badge> : "—"}</TableCell>
                  <TableCell><Badge variant={p.leadQuality === "hot" ? "danger" : p.leadQuality === "warm" ? "warn" : "muted"}>{p.leadQuality ?? "—"}</Badge></TableCell>
                  <TableCell className="text-xs">
                    <div>{p.channel ?? "—"}</div>
                    <div className="text-[var(--color-muted-fg)] truncate max-w-[200px]">{p.campaignNameSnapshot ?? "Unattributed"}</div>
                  </TableCell>
                  <TableCell className="text-xs">{p.assignedSalesName ?? "—"}</TableCell>
                  <TableCell className="text-xs">{formatDate(p.createdDate)}</TableCell>
                  <TableCell className="text-xs">{formatDate(p.lastActivityAt, true)}</TableCell>
                </TableRow>
              ))}
              {!leads.data?.rows.length && !leads.isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-[var(--color-muted-fg)]">No leads found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NewLeadForm({ stages, channels, salesUsers, onSubmit, submitting }: any) {
  const [data, setData] = useState<any>({});
  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit({ ...data, leadStageId: data.leadStageId ? parseInt(data.leadStageId) : null, assignedSalesId: data.assignedSalesId ? parseInt(data.assignedSalesId) : null }); }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div><Label>First name</Label><Input onChange={(e) => set("firstName", e.target.value)} /></div>
        <div><Label>Last name</Label><Input onChange={(e) => set("lastName", e.target.value)} /></div>
        <div><Label>Phone</Label><Input onChange={(e) => set("phone", e.target.value)} /></div>
        <div><Label>Email</Label><Input type="email" onChange={(e) => set("email", e.target.value)} /></div>
        <div className="col-span-2"><Label>Company</Label><Input onChange={(e) => set("companyName", e.target.value)} /></div>
        <div>
          <Label>Channel</Label>
          <NativeSelect onChange={(e) => set("channel", e.target.value)} defaultValue=""><option value="" disabled>Select…</option>{channels.map((c: any) => <option key={c.id} value={c.channelName}>{c.channelName}</option>)}</NativeSelect>
        </div>
        <div>
          <Label>Stage</Label>
          <NativeSelect onChange={(e) => set("leadStageId", e.target.value)} defaultValue=""><option value="" disabled>Select…</option>{stages.map((s: any) => <option key={s.id} value={s.id}>{s.stageName}</option>)}</NativeSelect>
        </div>
        <div>
          <Label>Assign to</Label>
          <NativeSelect onChange={(e) => set("assignedSalesId", e.target.value)} defaultValue=""><option value="">Me</option>{salesUsers.filter((u: any) => u.team === "Sales").map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</NativeSelect>
        </div>
        <div>
          <Label>Quality</Label>
          <NativeSelect onChange={(e) => set("leadQuality", e.target.value)} defaultValue="warm"><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option></NativeSelect>
        </div>
      </div>
      <div><Label>Notes</Label><Textarea onChange={(e) => set("notes", e.target.value)} /></div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Create lead"}</Button>
      </DialogFooter>
    </form>
  );
}
