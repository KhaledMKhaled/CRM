import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@shared/calculations";

export default function PipelinePage() {
  const stages = useQuery({ queryKey: ["lead-stages"], queryFn: () => api.get<any[]>(`/api/settings/lead-stages`) });
  const leads = useQuery({ queryKey: ["all-leads-pipeline"], queryFn: () => api.get<any>(`/api/prospects?limit=500`) });

  const stageList = (stages.data ?? []).filter((s) => s.isActive).sort((a, b) => a.stageOrder - b.stageOrder);
  const byStage = new Map<number, any[]>();
  (leads.data?.rows ?? []).forEach((p: any) => {
    if (!p.leadStageId) return;
    if (!byStage.has(p.leadStageId)) byStage.set(p.leadStageId, []);
    byStage.get(p.leadStageId)!.push(p);
  });

  return (
    <div>
      <PageHeader title="Pipeline" description="Drag-and-drop view (read-only). Use lead detail to advance stage." />
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stageList.length}, minmax(220px, 1fr))` }}>
        {stageList.map((s) => {
          const list = byStage.get(s.id) ?? [];
          return (
            <div key={s.id} className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between px-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-fg)]">{s.stageName}</div>
                <Badge variant="muted">{formatNumber(list.length)}</Badge>
              </div>
              <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                {list.slice(0, 60).map((p) => (
                  <Link key={p.id} to={`/leads/${p.id}`}>
                    <Card className="p-3 hover:bg-[var(--color-muted)]/40 transition-colors">
                      <div className="text-sm font-medium truncate">{p.fullName}</div>
                      <div className="text-xs text-[var(--color-muted-fg)] truncate">{p.companyName ?? p.channel}</div>
                      <div className="mt-1 flex items-center gap-1">
                        <Badge variant={p.leadQuality === "hot" ? "danger" : p.leadQuality === "warm" ? "warn" : "muted"} className="!text-[10px]">{p.leadQuality}</Badge>
                        {p.isAttributed && <Badge variant="success" className="!text-[10px]">Attr</Badge>}
                      </div>
                    </Card>
                  </Link>
                ))}
                {list.length > 60 && <div className="text-xs text-[var(--color-muted-fg)] text-center py-2">+ {list.length - 60} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
