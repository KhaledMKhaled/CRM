import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-[var(--color-primary)]/20",
        success: "bg-[var(--color-success)]/10 text-[var(--color-success)] ring-[var(--color-success)]/20",
        warn: "bg-[var(--color-warn)]/10 text-[var(--color-warn)] ring-[var(--color-warn)]/20",
        danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-[var(--color-danger)]/20",
        info: "bg-[var(--color-info)]/10 text-[var(--color-info)] ring-[var(--color-info)]/20",
        muted: "bg-[var(--color-muted)] text-[var(--color-muted-fg)] ring-[var(--color-border)]",
        outline: "bg-transparent text-[var(--color-fg)] ring-[var(--color-border)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
