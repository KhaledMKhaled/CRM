// Lightweight native-select wrapper to avoid radix complexity for many forms.
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-[var(--color-input)] bg-white px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
NativeSelect.displayName = "NativeSelect";
