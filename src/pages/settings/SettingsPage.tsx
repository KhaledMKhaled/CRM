import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PERMISSIONS, ALL_PERMISSIONS } from "@shared/permissions";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";

// ─── Generic CRUD table for simple lookup entities ───────────────────────────

function LookupManager({
  title,
  apiPath,
  queryKey,
  nameField,
  extraColumns,
  extraFormFields,
  canEdit,
}: {
  title: string;
  apiPath: string;
  queryKey: string;
  nameField: string;
  extraColumns?: { header: string; render: (row: any) => React.ReactNode }[];
  extraFormFields?: React.ReactNode;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const { data = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => api.get<any[]>(`/api/settings/${apiPath}`),
  });

  const upsert = useMutation({
    mutationFn: (body: any) =>
      editing
        ? api.patch(`/api/settings/${apiPath}/${editing.id}`, body)
        : api.post(`/api/settings/${apiPath}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      setShowForm(false);
      setEditing(null);
      reset();
      toast(editing ? "Updated successfully" : "Created successfully", "success");
    },
    onError: (e: any) => toast(e.message || "Error", "error"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/settings/${apiPath}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast("Deleted", "success");
    },
    onError: (e: any) => toast(e.message || "Cannot delete — referenced by existing records", "error"),
  });

  function openEdit(row: any) {
    setEditing(row);
    Object.keys(row).forEach((k) => setValue(k, row[k]));
    setShowForm(true);
  }

  function openNew() {
    setEditing(null);
    reset();
    setShowForm(true);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {canEdit && (
          <Button size="sm" onClick={openNew} className="h-8">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-[var(--color-muted-fg)] py-6 text-center">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {extraColumns?.map((c) => <TableHead key={c.header}>{c.header}</TableHead>)}
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3 + (extraColumns?.length ?? 0)} className="text-center py-8 text-[var(--color-muted-fg)]">
                    No records yet.
                  </TableCell>
                </TableRow>
              )}
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row[nameField]}</TableCell>
                  {extraColumns?.map((c) => <TableCell key={c.header}>{c.render(row)}</TableCell>)}
                  <TableCell>
                    {row.isActive !== false ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(row)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[var(--color-danger)]"
                          onClick={() => {
                            if (confirm(`Delete "${row[nameField]}"?`)) remove.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditing(null); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `New ${title}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => upsert.mutate(d))} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input {...register(nameField, { required: true })} className="mt-1" />
            </div>
            {extraFormFields}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} defaultChecked />
              <label htmlFor="isActive" className="text-sm">Active</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Roles & Permissions panel ───────────────────────────────────────────────

function RolesPanel({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data } = useQuery({
    queryKey: ["roles-perms"],
    queryFn: () => api.get<{ roles: any[]; allPermissions: string[] }>("/api/settings/roles"),
  });

  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [perms, setPerms] = useState<string[]>([]);

  function selectRole(role: any) {
    setSelectedRole(role);
    setPerms(role.permissionsJson ?? []);
  }

  function toggle(p: string) {
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  const save = useMutation({
    mutationFn: () => api.patch(`/api/settings/roles/${selectedRole.id}`, { permissionsJson: perms }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles-perms"] }); toast("Permissions saved", "success"); },
    onError: (e: any) => toast(e.message, "error"),
  });

  const allPerms = data?.allPermissions ?? [];
  const roles = data?.roles ?? [];

  // Group permissions by prefix
  const groups: Record<string, string[]> = {};
  allPerms.forEach((p) => {
    const [g] = p.split(".");
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Roles</CardTitle></CardHeader>
        <CardContent className="p-0">
          {roles.map((r) => (
            <button
              key={r.id}
              className={`w-full text-left px-4 py-3 text-sm border-b border-[var(--color-border)] last:border-0 transition-colors
                ${selectedRole?.id === r.id ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium" : "hover:bg-[var(--color-muted)]/40"}`}
              onClick={() => selectRole(r)}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 opacity-60" />
                {r.name}
                <span className="ml-auto text-xs text-[var(--color-muted-fg)]">
                  {(r.permissionsJson ?? []).length} perms
                </span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {selectedRole ? (
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Permissions — {selectedRole.name}</CardTitle>
            {canEdit && (
              <Button size="sm" className="h-8" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groups).map(([group, ps]) => (
                <div key={group}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-fg)] mb-2">
                    {group.replace(/_/g, " ")}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {ps.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={perms.includes(p)}
                          onChange={() => canEdit && toggle(p)}
                          disabled={!canEdit}
                          className="h-4 w-4"
                        />
                        <span className="font-mono text-xs">{p.split(".").slice(1).join(".")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="lg:col-span-2 flex items-center justify-center text-sm text-[var(--color-muted-fg)]">
          Select a role to manage its permissions.
        </div>
      )}
    </div>
  );
}

// ─── Custom Fields Manager ────────────────────────────────────────────────────

function CustomFieldsPanel({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();

  const { data = [] } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: () => api.get<any[]>("/api/settings/custom-fields"),
  });

  const upsert = useMutation({
    mutationFn: (body: any) =>
      editRow
        ? api.patch(`/api/settings/custom-fields/${editRow.id}`, body)
        : api.post("/api/settings/custom-fields", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      setShowForm(false);
      setEditRow(null);
      reset();
      toast(editRow ? "Updated" : "Created", "success");
    },
    onError: (e: any) => toast(e.message, "error"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/settings/custom-fields/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-fields"] }); toast("Deleted", "success"); },
  });

  function openEdit(row: any) {
    setEditRow(row);
    Object.keys(row).forEach((k) => setValue(k, row[k]));
    setShowForm(true);
  }

  const entities = ["prospect", "deal", "activity", "campaign", "ad_set", "ad"];
  const types = ["text", "number", "date", "select", "multiselect", "checkbox", "textarea", "url"];

  const byEntity: Record<string, any[]> = {};
  data.forEach((f) => {
    if (!byEntity[f.entityType]) byEntity[f.entityType] = [];
    byEntity[f.entityType].push(f);
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Custom Fields</h3>
        {canEdit && (
          <Button size="sm" className="h-8" onClick={() => { setEditRow(null); reset(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Field
          </Button>
        )}
      </div>

      {Object.entries(byEntity).map(([entity, fields]) => (
        <Card key={entity} className="mb-4">
          <CardHeader><CardTitle className="text-sm capitalize">{entity.replace(/_/g, " ")} fields</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Active</TableHead>
                  {canEdit && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.fieldLabel}</TableCell>
                    <TableCell><code className="text-xs">{f.fieldKey}</code></TableCell>
                    <TableCell><Badge variant="outline">{f.fieldType}</Badge></TableCell>
                    <TableCell>{f.isRequired ? <Badge variant="warn">Required</Badge> : <span className="text-xs text-[var(--color-muted-fg)]">Optional</span>}</TableCell>
                    <TableCell>{f.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(f)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--color-danger)]"
                            onClick={() => confirm(`Delete field "${f.fieldLabel}"?`) && remove.mutate(f.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {data.length === 0 && (
        <div className="text-center py-12 text-sm text-[var(--color-muted-fg)]">
          No custom fields defined. Click "Add Field" to create one.
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditRow(null); reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRow ? "Edit Custom Field" : "New Custom Field"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => upsert.mutate({ ...d, isRequired: !!d.isRequired, isFilterable: !!d.isFilterable, isActive: d.isActive !== false }))} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Entity *</label>
                <select {...register("entityType", { required: true })} className="mt-1 w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-card)]">
                  {entities.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Field Type *</label>
                <select {...register("fieldType", { required: true })} className="mt-1 w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-card)]">
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Label *</label>
              <Input {...register("fieldLabel", { required: true })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Field Key *</label>
              <Input {...register("fieldKey", { required: true })} className="mt-1" placeholder="snake_case_key" />
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" {...register("isRequired")} /> Required</label>
              <label className="flex items-center gap-2"><input type="checkbox" {...register("isFilterable")} defaultChecked /> Filterable</label>
              <label className="flex items-center gap-2"><input type="checkbox" {...register("isActive")} defaultChecked /> Active</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : editRow ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── KPI / SLA / Scoring simple tables ───────────────────────────────────────

function KpiPanel({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const { data } = useQuery({ queryKey: ["s-cfg"], queryFn: () => api.get<any>("/api/settings/config") });
  const kpis: any[] = data?.kpis ?? [];

  const upsert = useMutation({
    mutationFn: (body: any) =>
      editRow ? api.patch(`/api/settings/kpis/${editRow.id}`, body) : api.post("/api/settings/kpis", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["s-cfg"] }); setShowForm(false); setEditRow(null); reset(); toast("Saved", "success"); },
    onError: (e: any) => toast(e.message, "error"),
  });

  function openEdit(row: any) { setEditRow(row); Object.keys(row).forEach((k) => setValue(k, row[k])); setShowForm(true); }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">KPI Definitions</h3>
        {canEdit && <Button size="sm" className="h-8" onClick={() => { setEditRow(null); reset(); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add KPI</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead><TableHead>Name</TableHead><TableHead>Formula</TableHead><TableHead>Format</TableHead><TableHead>Level</TableHead>
                {canEdit && <TableHead className="w-16">Edit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((k) => (
                <TableRow key={k.id}>
                  <TableCell><code className="text-xs">{k.kpiKey}</code></TableCell>
                  <TableCell className="font-medium">{k.kpiName}</TableCell>
                  <TableCell className="text-xs text-[var(--color-muted-fg)]">{k.formula ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{k.formatType}</Badge></TableCell>
                  <TableCell className="text-xs">{k.entityLevel}</TableCell>
                  {canEdit && <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(k)}><Pencil className="h-3 w-3" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditRow(null); reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRow ? "Edit KPI" : "New KPI"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => upsert.mutate(d))} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Key *</label><Input {...register("kpiKey", { required: true })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Name *</label><Input {...register("kpiName", { required: true })} className="mt-1" /></div>
            </div>
            <div><label className="text-sm font-medium">Formula</label><Input {...register("formula")} className="mt-1" placeholder="e.g. revenue / spend" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Format</label>
                <select {...register("formatType")} className="mt-1 w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-card)]">
                  {["currency", "percent", "ratio", "number"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium">Level</label><Input {...register("entityLevel")} className="mt-1" placeholder="campaign, ad, user…" /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : editRow ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SlaPanel({ canEdit }: { canEdit: boolean }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const { data } = useQuery({ queryKey: ["s-cfg"], queryFn: () => api.get<any>("/api/settings/config") });
  const slaRules: any[] = data?.slaRules ?? [];

  const upsert = useMutation({
    mutationFn: (body: any) =>
      editRow ? api.patch(`/api/settings/sla-rules/${editRow.id}`, body) : api.post("/api/settings/sla-rules", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["s-cfg"] }); setShowForm(false); setEditRow(null); reset(); toast("Saved", "success"); },
    onError: (e: any) => toast(e.message, "error"),
  });

  function openEdit(row: any) { setEditRow(row); Object.keys(row).forEach((k) => setValue(k, row[k])); setShowForm(true); }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">SLA Rules</h3>
        {canEdit && <Button size="sm" className="h-8" onClick={() => { setEditRow(null); reset(); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add Rule</Button>}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead><TableHead>Max Response</TableHead><TableHead>Max Follow-up</TableHead><TableHead>Priority</TableHead><TableHead>Active</TableHead>
                {canEdit && <TableHead className="w-16">Edit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaRules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.ruleName}</TableCell>
                  <TableCell>{r.maxResponseMinutes ? `${r.maxResponseMinutes} min` : "—"}</TableCell>
                  <TableCell>{r.maxFollowupHours ? `${r.maxFollowupHours} hr` : "—"}</TableCell>
                  <TableCell><Badge variant={r.priority === "high" ? "danger" : "muted"}>{r.priority}</Badge></TableCell>
                  <TableCell>{r.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                  {canEdit && <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditRow(null); reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRow ? "Edit SLA Rule" : "New SLA Rule"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => upsert.mutate({ ...d, maxResponseMinutes: d.maxResponseMinutes ? parseInt(d.maxResponseMinutes) : null, maxFollowupHours: d.maxFollowupHours ? parseInt(d.maxFollowupHours) : null, isActive: d.isActive !== false }))} className="space-y-3 mt-2">
            <div><label className="text-sm font-medium">Rule Name *</label><Input {...register("ruleName", { required: true })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Max Response (min)</label><Input type="number" {...register("maxResponseMinutes")} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Max Follow-up (hr)</label><Input type="number" {...register("maxFollowupHours")} className="mt-1" /></div>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select {...register("priority")} className="mt-1 w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-card)]">
                <option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("isActive")} defaultChecked /> Active</label>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : editRow ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const canEdit = useHasPermission(PERMISSIONS.SETTINGS_EDIT);

  return (
    <div>
      <PageHeader title="Settings" description="System configuration: stages, lookups, roles, custom fields, KPIs, and SLA rules." />
      <Tabs defaultValue="stages">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="stages">Lead Stages</TabsTrigger>
          <TabsTrigger value="statuses">Lead Statuses</TabsTrigger>
          <TabsTrigger value="lost">Lost Reasons</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="activity-types">Activity Types</TabsTrigger>
          <TabsTrigger value="roles">Roles & Perms</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="kpis">KPI Definitions</TabsTrigger>
          <TabsTrigger value="sla">SLA Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="mt-4">
          <LookupManager title="Lead Stages" apiPath="lead-stages" queryKey="s-stages" nameField="stageName" canEdit={canEdit}
            extraColumns={[
              { header: "Order", render: (r) => r.stageOrder },
              { header: "Type", render: (r) => <Badge variant={r.stageType === "won" ? "success" : r.stageType === "lost" ? "danger" : "info"}>{r.stageType ?? "active"}</Badge> },
            ]}
          />
        </TabsContent>
        <TabsContent value="statuses" className="mt-4">
          <LookupManager title="Lead Statuses" apiPath="lead-statuses" queryKey="s-statuses" nameField="statusName" canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="lost" className="mt-4">
          <LookupManager title="Lost Reasons" apiPath="lost-reasons" queryKey="s-lost" nameField="reasonName" canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <LookupManager title="Products" apiPath="products" queryKey="s-products" nameField="productName" canEdit={canEdit}
            extraColumns={[
              { header: "Category", render: (r) => r.productCategory ?? "—" },
              { header: "Price (EGP)", render: (r) => r.price ? parseFloat(r.price).toLocaleString() : "—" },
              { header: "Billing", render: (r) => r.billingCycle ?? "—" },
            ]}
          />
        </TabsContent>
        <TabsContent value="channels" className="mt-4">
          <LookupManager title="Channels" apiPath="channels" queryKey="s-channels" nameField="channelName" canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="activity-types" className="mt-4">
          <LookupManager title="Activity Types" apiPath="activity-types" queryKey="s-act-types" nameField="typeName" canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <RolesPanel canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="custom-fields" className="mt-4">
          <CustomFieldsPanel canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="kpis" className="mt-4">
          <KpiPanel canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="sla" className="mt-4">
          <SlaPanel canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
