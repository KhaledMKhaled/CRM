import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warn" | "danger" | "info";
}

const TONE: Record<string, string> = {
  default: "text-[var(--color-primary)] bg-[var(--color-primary)]/10",
  success: "text-[var(--color-success)] bg-[var(--color-success)]/10",
  warn:    "text-[var(--color-warn)] bg-[var(--color-warn)]/10",
  danger:  "text-[var(--color-danger)] bg-[var(--color-danger)]/10",
  info:    "text-[var(--color-info)] bg-[var(--color-info)]/10",
};

export function StatCard({ label, value, hint, icon, tone = "default" }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-[var(--color-muted-fg)]">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold leading-tight">{value}</div>
          {hint && <div className="mt-1 truncate text-xs text-[var(--color-muted-fg)]">{hint}</div>}
        </div>
        {icon && <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", TONE[tone])}>{icon}</div>}
      </div>
    </Card>
  );
}
