import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@shared/calculations";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@shared/permissions";

interface Stage {
  id: number;
  stageName: string;
  stageOrder: number;
  isActive: boolean;
  stageType: string;
}
interface Prospect {
  id: number;
  fullName: string;
  companyName?: string | null;
  channel?: string | null;
  leadStageId?: number | null;
  leadQuality?: string | null;
  isAttributed?: boolean;
}

export default function PipelinePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(PERMISSIONS.LEADS_EDIT);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverStage, setHoverStage] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stagesQ = useQuery({ queryKey: ["lead-stages"], queryFn: () => api.get<Stage[]>(`/api/settings/lead-stages`) });
  const leadsQ = useQuery({ queryKey: ["all-leads-pipeline"], queryFn: () => api.get<{ rows: Prospect[] }>(`/api/prospects?limit=500`) });

  const updateStage = useMutation({
    mutationFn: ({ id, leadStageId }: { id: number; leadStageId: number }) =>
      api.patch(`/api/prospects/${id}`, { leadStageId }),
    onMutate: async ({ id, leadStageId }) => {
      await qc.cancelQueries({ queryKey: ["all-leads-pipeline"] });
      const prev = qc.getQueryData<{ rows: Prospect[] }>(["all-leads-pipeline"]);
      if (prev) {
        qc.setQueryData(["all-leads-pipeline"], {
          ...prev,
          rows: prev.rows.map((r) => (r.id === id ? { ...r, leadStageId } : r)),
        });
      }
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["all-leads-pipeline"], ctx.prev);
      setErrorMsg(e.message || "Failed to move lead");
    },
    onSuccess: () => {
      setErrorMsg(null);
      qc.invalidateQueries({ queryKey: ["all-leads-pipeline"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const stageList = (stagesQ.data ?? []).filter((s) => s.isActive).sort((a, b) => a.stageOrder - b.stageOrder);
  const byStage = new Map<number, Prospect[]>();
  (leadsQ.data?.rows ?? []).forEach((p) => {
    if (!p.leadStageId) return;
    if (!byStage.has(p.leadStageId)) byStage.set(p.leadStageId, []);
    byStage.get(p.leadStageId)!.push(p);
  });

  function handleDrop(stageId: number) {
    if (!canEdit || draggingId == null) return;
    setHoverStage(null);
    const id = draggingId;
    setDraggingId(null);
    const lead = (leadsQ.data?.rows ?? []).find((r) => r.id === id);
    if (!lead || lead.leadStageId === stageId) return;
    updateStage.mutate({ id, leadStageId: stageId });
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description={
          canEdit
            ? "Drag a card from one column to another to advance the lead. Stage changes are logged automatically as activities."
            : "Read-only view. Open a lead to change its stage."
        }
      />
      {errorMsg && (
        <div className="mb-3 rounded-md bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMsg}
        </div>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stageList.length}, minmax(220px, 1fr))` }}>
        {stageList.map((s) => {
          const list = byStage.get(s.id) ?? [];
          const isHover = hoverStage === s.id && draggingId != null;
          return (
            <div
              key={s.id}
              className={`flex flex-col gap-2 min-w-0 rounded-md transition-colors ${
                isHover ? "bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/40" : ""
              }`}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                if (hoverStage !== s.id) setHoverStage(s.id);
              }}
              onDragLeave={() => setHoverStage((h) => (h === s.id ? null : h))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(s.id);
              }}
            >
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-fg)]">
                  {s.stageName}
                </div>
                <Badge variant={s.stageType === "won" ? "success" : s.stageType === "lost" ? "danger" : "muted"}>
                  {formatNumber(list.length)}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto px-1 pb-2">
                {list.slice(0, 60).map((p) => (
                  <div
                    key={p.id}
                    draggable={canEdit}
                    onDragStart={() => setDraggingId(p.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setHoverStage(null);
                    }}
                    className={canEdit ? "cursor-grab active:cursor-grabbing" : ""}
                  >
                    <Link to={`/leads/${p.id}`}>
                      <Card className="p-3 hover:bg-[var(--color-muted)]/40 transition-colors">
                        <div className="text-sm font-medium truncate">{p.fullName}</div>
                        <div className="text-xs text-[var(--color-muted-fg)] truncate">
                          {p.companyName ?? p.channel}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <Badge
                            variant={p.leadQuality === "hot" ? "danger" : p.leadQuality === "warm" ? "warn" : "muted"}
                            className="!text-[10px]"
                          >
                            {p.leadQuality}
                          </Badge>
                          {p.isAttributed && <Badge variant="success" className="!text-[10px]">Attr</Badge>}
                        </div>
                      </Card>
                    </Link>
                  </div>
                ))}
                {list.length > 60 && (
                  <div className="text-xs text-[var(--color-muted-fg)] text-center py-2">
                    + {list.length - 60} more
                  </div>
                )}
                {list.length === 0 && canEdit && (
                  <div className="text-xs text-[var(--color-muted-fg)] text-center py-6 italic">
                    Drop a card here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
