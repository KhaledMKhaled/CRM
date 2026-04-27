import { useState } from "react";
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
import { ArrowLeft, Phone, Mail, Building2, MapPin, Tag, Calendar, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@shared/calculations";

export default function LeadDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => api.get<any>(`/api/prospects/${id}`) });
  const stages = useQuery({ queryKey: ["lead-stages"], queryFn: () => api.get<any[]>(`/api/settings/lead-stages`) });

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
