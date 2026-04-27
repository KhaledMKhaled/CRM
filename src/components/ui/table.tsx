import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(({ className, ...p }, ref) => (
  <div className="w-full overflow-auto">
    <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...p} />
  </div>
));
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...p }, ref) => <thead ref={ref} className={cn("border-b bg-[var(--color-muted)]/50 [&_tr]:border-b", className)} {...p} />
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...p }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...p} />
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...p }, ref) => <tr ref={ref} className={cn("border-b transition-colors hover:bg-[var(--color-muted)]/50 data-[state=selected]:bg-[var(--color-muted)]", className)} {...p} />
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...p }, ref) => <th ref={ref} className={cn("h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-fg)]", className)} {...p} />
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...p }, ref) => <td ref={ref} className={cn("p-3 align-middle", className)} {...p} />
);
TableCell.displayName = "TableCell";
