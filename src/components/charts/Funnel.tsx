import { formatNumber, formatPercent } from "@shared/calculations";

interface Step {
  label: string;
  value: number;
  color?: string;
}

export function Funnel({ steps }: { steps: Step[] }) {
  if (!steps.length) return null;
  const max = Math.max(...steps.map((s) => s.value));
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const pct = max ? s.value / max : 0;
        const fromPrev = i > 0 && steps[i - 1].value > 0 ? s.value / steps[i - 1].value : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">{s.label}</span>
              <span className="text-[var(--color-muted-fg)]">
                {formatNumber(s.value)}
                {fromPrev !== null && <span className="ml-2 text-[10px]">({formatPercent(fromPrev)} from prev)</span>}
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded bg-[var(--color-muted)]">
              <div
                className="flex h-full items-center justify-end pr-2 text-[10px] font-semibold text-white"
                style={{
                  width: `${pct * 100}%`,
                  backgroundColor: s.color ?? "hsl(221 83% 53%)",
                  minWidth: pct > 0 ? 32 : 0,
                  transition: "width 200ms ease",
                }}
              >
                {pct > 0.04 ? formatPercent(pct, 0) : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
