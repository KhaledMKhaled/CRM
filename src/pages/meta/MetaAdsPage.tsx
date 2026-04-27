import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import { useToast } from "@/components/ui/toast";
import { useHasPermission } from "@/hooks/useHasPermission";
import { PERMISSIONS } from "@shared/permissions";
import { formatCurrency, formatNumber, formatPercent } from "@shared/calculations";
import { Download, Plus, Upload } from "lucide-react";
import { downloadCsv } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";

interface PerfRow {
  id: number;
  date: string;
  campaignName?: string;
  campaignId?: number | null;
  adsetName?: string;
  adsetId?: number | null;
  adName?: string;
  adId?: number | null;
  channel?: string | null;
  amountSpent?: string;
  impressions?: number;
  reach?: number;
  clicks?: number;
  linkClicks?: number;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  messagingConversationsStarted?: number;
  messagingConversationsReplied?: number;
  metaLeads?: number;
  websiteRegistrationsCompleted?: number;
  purchases?: number;
}

const columns: ColumnDef<PerfRow, any>[] = [
  { accessorKey: "date", header: "Date", cell: ({ getValue }) => <span className="text-xs font-mono whitespace-nowrap">{getValue()}</span> },
  {
    accessorKey: "campaignName",
    header: "Campaign",
    cell: ({ row }) => (
      <span className="text-xs max-w-[180px] truncate block">
        {row.original.campaignId ? (
          <Link to={`/campaigns/${row.original.campaignId}`} className="text-[var(--color-primary)] hover:underline">
            {row.original.campaignName ?? `#${row.original.campaignId}`}
          </Link>
        ) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "adsetName",
    header: "Ad Set",
    cell: ({ row }) => <span className="text-xs max-w-[140px] truncate block text-[var(--color-muted-fg)]">{row.original.adsetName ?? "—"}</span>,
  },
  {
    accessorKey: "adName",
    header: "Ad",
    cell: ({ row }) => <span className="text-xs max-w-[140px] truncate block text-[var(--color-muted-fg)]">{row.original.adName ?? "—"}</span>,
  },
  {
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => row.original.channel ? <Badge variant="outline">{row.original.channel}</Badge> : <span className="text-[var(--color-muted-fg)]">—</span>,
  },
  {
    accessorKey: "amountSpent",
    header: "Spend",
    cell: ({ getValue }) => <span className="text-right block">{formatCurrency(parseFloat(getValue() ?? "0"))}</span>,
  },
  {
    accessorKey: "impressions",
    header: "Impr.",
    cell: ({ getValue }) => <span className="text-right block">{formatNumber(getValue())}</span>,
  },
  {
    accessorKey: "clicks",
    header: "Clicks",
    cell: ({ getValue }) => <span className="text-right block">{formatNumber(getValue())}</span>,
  },
  {
    accessorKey: "ctr",
    header: "CTR",
    cell: ({ row }) => {
      const clicks = row.original.clicks ?? 0;
      const impressions = row.original.impressions ?? 1;
      return <span className="text-right block text-xs">{formatPercent(clicks / Math.max(impressions, 1), 2)}</span>;
    },
  },
  {
    accessorKey: "cpc",
    header: "CPC",
    cell: ({ row }) => {
      const spend = parseFloat(row.original.amountSpent ?? "0");
      const clicks = row.original.clicks ?? 0;
      return <span className="text-right block text-xs">{formatCurrency(clicks > 0 ? spend / clicks : 0)}</span>;
    },
  },
  {
    accessorKey: "messagingConversationsStarted",
    header: "Conv.",
    cell: ({ getValue }) => <span className="text-right block">{formatNumber(getValue())}</span>,
  },
  {
    accessorKey: "messagingConversationsReplied",
    header: "Replies",
    cell: ({ getValue }) => <span className="text-right block">{formatNumber(getValue())}</span>,
  },
  {
    accessorKey: "metaLeads",
    header: "Leads",
    cell: ({ getValue }) => <span className="text-right block">{formatNumber(getValue())}</span>,
  },
  {
    accessorKey: "websiteRegistrationsCompleted",
    header: "Regs.",
    cell: ({ getValue }) => <span className="text-right block">{formatNumber(getValue())}</span>,
  },
  {
    accessorKey: "purchases",
    header: "Purchases",
    cell: ({ getValue }) => <span className="text-right block">{formatNumber(getValue())}</span>,
  },
];

export default function MetaAdsPage() {
  const { range, setRange, presets } = useDateRange();
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canEdit = useHasPermission(PERMISSIONS.META_ADS_EDIT);
  const [showAdd, setShowAdd] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["meta-perf", range],
    queryFn: () => api.get<PerfRow[]>(`/api/meta/daily?from=${range.from}&to=${range.to}`),
  });

  const campaigns = useQuery({
    queryKey: ["campaigns-list"],
    queryFn: () => api.get<any[]>("/api/campaigns"),
  });

  const { register, handleSubmit, reset, watch } = useForm<any>();
  const selectedCampaignId = watch("campaignId");

  const adsets = useQuery({
    queryKey: ["adsets-for-campaign", selectedCampaignId],
    queryFn: () => api.get<any[]>(`/api/campaigns/adsets?campaignId=${selectedCampaignId}`),
    enabled: !!selectedCampaignId,
  });
  const selectedAdsetId = watch("adsetId");
  const ads = useQuery({
    queryKey: ["ads-for-adset", selectedAdsetId],
    queryFn: () => api.get<any[]>(`/api/campaigns/ads?adsetId=${selectedAdsetId}`),
    enabled: !!selectedAdsetId,
  });

  const addRow = useMutation({
    mutationFn: (body: any) => api.post("/api/meta/daily", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-perf"] });
      setShowAdd(false);
      reset();
      toast("Row added", "success");
    },
    onError: (e: any) => toast(e.message || "Error adding row", "error"),
  });

  return (
    <div>
      <PageHeader
        title="Meta Ads Daily Performance"
        description="Imported daily performance rows per campaign / ad set / ad."
        actions={
          <div className="flex gap-2 flex-wrap">
            <DateRangePicker value={range} onChange={setRange} presets={presets} />
            {canEdit && (
              <>
                <Button size="sm" className="h-8" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add row
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => navigate("/imports")}>
                  <Upload className="h-4 w-4 mr-1" /> Import CSV/Excel
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="h-8" onClick={() => downloadCsv(data, `meta-perf-${range.from}-${range.to}.csv`)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        }
      />

      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Search by campaign, ad set, ad…"
        exportFilename={`meta-perf-${range.from}-${range.to}.csv`}
        isLoading={isLoading}
        emptyMessage="No performance rows for this date range."
        pageSize={50}
      />

      {/* Manual add dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add performance row</DialogTitle></DialogHeader>
          <form
            onSubmit={handleSubmit((d) => addRow.mutate({
              ...d,
              campaignId: d.campaignId ? parseInt(d.campaignId) : null,
              adsetId: d.adsetId ? parseInt(d.adsetId) : null,
              adId: d.adId ? parseInt(d.adId) : null,
              impressions: parseInt(d.impressions ?? "0"),
              reach: parseInt(d.reach ?? "0"),
              clicks: parseInt(d.clicks ?? "0"),
              linkClicks: parseInt(d.linkClicks ?? "0"),
              messagingConversationsStarted: parseInt(d.messagingConversationsStarted ?? "0"),
              messagingConversationsReplied: parseInt(d.messagingConversationsReplied ?? "0"),
              metaLeads: parseInt(d.metaLeads ?? "0"),
              websiteRegistrationsCompleted: parseInt(d.websiteRegistrationsCompleted ?? "0"),
              purchases: parseInt(d.purchases ?? "0"),
            }))}
            className="space-y-3 mt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Date *</label>
                <Input type="date" {...register("date", { required: true })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Spend (EGP) *</label>
                <Input type="number" step="0.01" {...register("amountSpent", { required: true })} className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Campaign</label>
              <select {...register("campaignId")} className="mt-1 w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-card)]">
                <option value="">— None —</option>
                {(campaigns.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.campaignName}</option>)}
              </select>
            </div>
            {selectedCampaignId && (
              <div>
                <label className="text-sm font-medium">Ad Set</label>
                <select {...register("adsetId")} className="mt-1 w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-card)]">
                  <option value="">— None —</option>
                  {(adsets.data ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.adsetName}</option>)}
                </select>
              </div>
            )}
            {selectedAdsetId && (
              <div>
                <label className="text-sm font-medium">Ad</label>
                <select {...register("adId")} className="mt-1 w-full border border-[var(--color-border)] rounded-md px-3 py-2 text-sm bg-[var(--color-card)]">
                  <option value="">— None —</option>
                  {(ads.data ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.adName}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Impressions", key: "impressions" },
                { label: "Reach", key: "reach" },
                { label: "Clicks", key: "clicks" },
                { label: "Link Clicks", key: "linkClicks" },
                { label: "Conversations", key: "messagingConversationsStarted" },
                { label: "Replies", key: "messagingConversationsReplied" },
                { label: "Meta Leads", key: "metaLeads" },
                { label: "Website Regs", key: "websiteRegistrationsCompleted" },
                { label: "Purchases", key: "purchases" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs font-medium">{label}</label>
                  <Input type="number" {...register(key)} defaultValue="0" className="mt-1 h-8 text-sm" />
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setShowAdd(false); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={addRow.isPending}>{addRow.isPending ? "Saving…" : "Add row"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
