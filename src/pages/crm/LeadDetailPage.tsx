import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Mail, Building2, MapPin, Tag, Calendar, MessageSquare, Save } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@shared/calculations";
import { useToast } from "@/components/ui/toast";
import { useHasPermission } from "@/hooks/useHasPermission";
import { PERMISSIONS } from "@shared/permissions";

export default function LeadDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const canEdit = useHasPermission(PERMISSIONS.LEADS_EDIT);
  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => api.get<any>(`/api/prospects/${id}`) });
  const stages = useQuery({ queryKey: ["lead-stages"], queryFn: () => api.get<any[]>(`/api/settings/lead-stages`) });
  const cfQ = useQuery({ queryKey: ["lead-cf", id], queryFn: () => api.get<any[]>(`/api/prospects/${id}/custom-fields`) });

  const updateMut = useMutation({
    mutationFn: (data: any) => api.patch(`/api/prospects/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  const addActMut = useMutation({
    mutationFn: (data: any) => api.post(`/api/activities`, { ...data, prospectId: parseInt(id!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  if (lead.isLoading) return <div className="text-sm text-[var(--color-muted-fg)]">Loading…</div>;
  if (!lead.data) return <div>Not found</div>;
  const p = lead.data;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xs">
        <Link to="/leads" className="flex items-center gap-1 text-[var(--color-primary)] hover:underline"><ArrowLeft className="h-3 w-3" /> Back to leads</Link>
        <span className="text-[var(--color-muted-fg)]">· {p.prospectCode}</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{p.fullName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-[var(--color-muted-fg)]">
            {p.jobTitle && <span>{p.jobTitle}</span>}
            {p.companyName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {p.companyName}</span>}
            {p.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={p.leadQuality === "hot" ? "danger" : p.leadQuality === "warm" ? "warn" : "muted"}>Quality: {p.leadQuality ?? "—"}</Badge>
          <Badge variant={p.isAttributed ? "success" : "muted"}>{p.isAttributed ? "Attributed" : "Unattributed"}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[var(--color-muted-fg)]" /> {p.phone}</div>}
              {p.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[var(--color-muted-fg)]" /> {p.email}</div>}
              <div className="text-xs text-[var(--color-muted-fg)] pt-2 border-t">Industry: {p.industry ?? "—"} · {p.country ?? "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attribution</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-[var(--color-muted-fg)]">Channel:</span> {p.channel ?? "—"}</div>
              <div><span className="text-[var(--color-muted-fg)]">Source:</span> {p.source ?? "—"}</div>
              <div className="text-xs"><span className="text-[var(--color-muted-fg)]">Campaign:</span> {p.campaignNameSnapshot ?? "—"}</div>
              <div className="text-xs"><span className="text-[var(--color-muted-fg)]">Ad set:</span> {p.adsetNameSnapshot ?? "—"}</div>
              <div className="text-xs"><span className="text-[var(--color-muted-fg)]">Ad:</span> {p.adNameSnapshot ?? "—"}</div>
              <div className="text-xs pt-2 border-t text-[var(--color-muted-fg)]">UTM: {p.utmSource ?? "—"} / {p.utmMedium ?? "—"} / {p.utmCampaign ?? "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Lifecycle</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div><span className="text-[var(--color-muted-fg)]">Created:</span> {formatDate(p.createdDate, true)}</div>
              <div><span className="text-[var(--color-muted-fg)]">First reply:</span> {formatDate(p.firstReplyAt, true)}</div>
              <div><span className="text-[var(--color-muted-fg)]">MQL:</span> {formatDate(p.mqlAt, true)}</div>
              <div><span className="text-[var(--color-muted-fg)]">SQL:</span> {formatDate(p.sqlAt, true)}</div>
              <div><span className="text-[var(--color-muted-fg)]">Won:</span> {formatDate(p.wonAt, true)}</div>
              <div><span className="text-[var(--color-muted-fg)]">Lost:</span> {formatDate(p.lostAt, true)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Update stage</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label>Stage</Label>
                  <NativeSelect
                    defaultValue={p.leadStageId ?? ""}
                    onChange={(e) => updateMut.mutate({ leadStageId: parseInt(e.target.value) })}
                  >
                    <option value="" disabled>Select…</option>
                    {(stages.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.stageName}</option>)}
                  </NativeSelect>
                </div>
                <div className="flex-1">
                  <Label>Quality</Label>
                  <NativeSelect
                    defaultValue={p.leadQuality ?? ""}
                    onChange={(e) => updateMut.mutate({ leadQuality: e.target.value })}
                  >
                    <option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
                  </NativeSelect>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="activities">
            <TabsList>
              <TabsTrigger value="activities">Activities ({p.activities?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="deals">Deals ({p.deals?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="custom-fields">
                Custom Fields {(cfQ.data?.length ?? 0) > 0 ? `(${cfQ.data!.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="log">Log activity</TabsTrigger>
            </TabsList>

            <TabsContent value="activities">
              <Card>
                <CardContent className="p-4 space-y-3">
                  {!p.activities?.length && <div className="text-sm text-[var(--color-muted-fg)] text-center py-8">No activities logged yet.</div>}
                  {p.activities?.map((a: any) => (
                    <div key={a.id} className="border-l-2 border-[var(--color-primary)] pl-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="h-3 w-3 text-[var(--color-muted-fg)]" />
                        <span className="font-medium">{a.activityType}</span>
                        {a.activityChannel && <Badge variant="muted">{a.activityChannel}</Badge>}
                        {a.activityOutcome && <Badge variant="info">{a.activityOutcome}</Badge>}
                        <span className="text-xs text-[var(--color-muted-fg)] ml-auto">{formatDate(a.activityDate, true)}</span>
                      </div>
                      {a.notes && <div className="text-xs text-[var(--color-muted-fg)] mt-1">{a.notes}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deals">
              <Card>
                <CardContent className="p-4 space-y-3">
                  {!p.deals?.length && <div className="text-sm text-[var(--color-muted-fg)] text-center py-8">No deals yet.</div>}
                  {p.deals?.map((d: any) => (
                    <div key={d.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{d.dealName}</div>
                        <Badge variant={d.dealStatus === "won" ? "success" : d.dealStatus === "lost" ? "danger" : "info"}>{d.dealStatus}</Badge>
                      </div>
                      <div className="text-xs text-[var(--color-muted-fg)] mt-1">
                        Expected {formatCurrency(parseFloat(d.expectedRevenue))} · Actual {formatCurrency(parseFloat(d.actualRevenue))} · Probability {d.probability}%
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="log">
              <Card>
                <CardContent className="p-4">
                  <LogActivityForm onSubmit={(d) => addActMut.mutate(d)} submitting={addActMut.isPending} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom-fields">
              <Card>
                <CardContent className="p-4">
                  <CustomFieldsPanel
                    fields={cfQ.data ?? []}
                    prospectId={parseInt(id!)}
                    canEdit={canEdit}
                    onSaved={() => {
                      qc.invalidateQueries({ queryKey: ["lead-cf", id] });
                      toast("Custom fields saved", "success");
                    }}
                    onError={(msg) => toast(msg, "error")}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LogActivityForm({ onSubmit, submitting }: any) {
  const [d, setD] = useState<any>({ activityType: "Call", activityOutcome: "Interested", notes: "" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(d); setD({ activityType: "Call", activityOutcome: "Interested", notes: "" }); }} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Type</Label>
          <NativeSelect value={d.activityType} onChange={(e) => setD({ ...d, activityType: e.target.value })}>
            {["Call", "WhatsApp Message", "Email", "Meeting (Online)", "Meeting (In-person)", "Demo", "Proposal Sent", "Note"].map((t) => <option key={t}>{t}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label>Outcome</Label>
          <NativeSelect value={d.activityOutcome} onChange={(e) => setD({ ...d, activityOutcome: e.target.value })}>
            {["Interested", "No answer", "Follow up later", "Not interested", "Demo booked", "Proposal sent"].map((t) => <option key={t}>{t}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label>Next followup</Label>
          <Input type="datetime-local" onChange={(e) => setD({ ...d, nextFollowupDate: e.target.value })} />
        </div>
      </div>
      <Textarea placeholder="Notes…" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
      <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Log activity"}</Button>
    </form>
  );
}

// ── Dynamic Custom Fields panel ───────────────────────────────────────────────
function getInitialValue(f: any): string {
  const v = f.value;
  if (!v) return "";
  switch (f.fieldType) {
    case "number": return v.valueNumber ?? "";
    case "date": return v.valueDate ? v.valueDate.slice(0, 10) : "";
    case "checkbox": return v.valueJson === true || v.valueText === "true" ? "true" : "false";
    case "select":
    case "multiselect": return v.valueText ?? "";
    default: return v.valueText ?? "";
  }
}

function CustomFieldsPanel({ fields, prospectId, canEdit, onSaved, onError }: {
  fields: any[];
  prospectId: number;
  canEdit: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init: Record<number, string> = {};
    fields.forEach((f) => { init[f.id] = getInitialValue(f); });
    setValues(init);
  }, [fields]);

  if (fields.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-[var(--color-muted-fg)]">
        No custom fields defined for prospects. Go to{" "}
        <a href="/settings" className="text-[var(--color-primary)] hover:underline">Settings → Custom Fields</a>{" "}
        to add some.
      </div>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = fields.map((f) => {
        const raw = values[f.id] ?? "";
        const isNum = f.fieldType === "number";
        const isDate = f.fieldType === "date";
        const isCheck = f.fieldType === "checkbox";
        return {
          fieldId: f.id,
          valueText: isNum || isDate || isCheck ? null : raw || null,
          valueNumber: isNum ? (raw || null) : null,
          valueDate: isDate ? (raw || null) : null,
          valueJson: isCheck ? (raw === "true") : null,
        };
      });
      await api.put(`/api/prospects/${prospectId}/custom-fields`, { values: payload });
      onSaved();
    } catch (e: any) {
      onError(e.message || "Failed to save custom fields");
    } finally {
      setSaving(false);
    }
  }

  function renderInput(f: any) {
    const val = values[f.id] ?? "";
    const change = (v: string) => setValues((prev) => ({ ...prev, [f.id]: v }));
    const disabled = !canEdit;

    switch (f.fieldType) {
      case "textarea":
        return <Textarea value={val} onChange={(e) => change(e.target.value)} disabled={disabled} rows={3} />;
      case "number":
        return <Input type="number" value={val} onChange={(e) => change(e.target.value)} disabled={disabled} />;
      case "date":
        return <Input type="date" value={val} onChange={(e) => change(e.target.value)} disabled={disabled} />;
      case "checkbox":
        return (
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={val === "true"}
              onChange={(e) => change(e.target.checked ? "true" : "false")}
              disabled={disabled}
              className="h-4 w-4"
            />
            <span className="text-sm">{val === "true" ? "Yes" : "No"}</span>
          </label>
        );
      case "url":
        return (
          <div className="flex gap-2">
            <Input type="url" value={val} onChange={(e) => change(e.target.value)} disabled={disabled} placeholder="https://…" className="flex-1" />
            {val && <a href={val} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] text-sm self-center hover:underline">Open ↗</a>}
          </div>
        );
      case "select": {
        const opts: string[] = f.optionsJson ?? [];
        return (
          <NativeSelect value={val} onChange={(e) => change(e.target.value)} disabled={disabled}>
            <option value="">— Select —</option>
            {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
          </NativeSelect>
        );
      }
      case "multiselect": {
        const opts: string[] = f.optionsJson ?? [];
        const selected = val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
        function toggleOpt(o: string) {
          const s = new Set(selected);
          s.has(o) ? s.delete(o) : s.add(o);
          change([...s].join(", "));
        }
        return (
          <div className="flex flex-wrap gap-2 mt-1">
            {opts.map((o: string) => (
              <button
                key={o}
                type="button"
                onClick={() => !disabled && toggleOpt(o)}
                className={`px-2 py-1 rounded text-xs border transition-colors ${
                  selected.includes(o)
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {o}
              </button>
            ))}
          </div>
        );
      }
      default:
        return <Input value={val} onChange={(e) => change(e.target.value)} disabled={disabled} />;
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id}>
            <Label className="flex items-center gap-1 text-sm font-medium">
              {f.fieldLabel}
              {f.isRequired && <span className="text-[var(--color-danger)] text-xs ml-1">*</span>}
              <Badge variant="outline" className="ml-auto text-[10px] font-mono">{f.fieldType}</Badge>
            </Label>
            <div className="mt-1">{renderInput(f)}</div>
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save custom fields"}
          </Button>
        </div>
      )}
    </div>
  );
}
