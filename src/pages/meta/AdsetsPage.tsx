import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import { formatCurrency, formatNumber, formatPercent } from "@shared/calculations";
import type { ColumnDef } from "@tanstack/react-table";

interface AdSetRow {
  id: number;
  adsetName: string;
  campaignName?: string;
  campaignId?: number | null;
  audience?: string | null;
  placement?: string | null;
  optimizationGoal?: string | null;
  status: string;
  budget?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

const columns: ColumnDef<AdSetRow, any>[] = [
  {
    accessorKey: "adsetName",
    header: "Ad Set",
    cell: ({ row }) => (
      <Link to={`/adsets/${row.original.id}`} className="text-[var(--color-primary)] hover:underline font-medium">
        {row.original.adsetName}
      </Link>
    ),
  },
  {
    accessorKey: "campaignName",
    header: "Campaign",
    cell: ({ row }) =>
      row.original.campaignId ? (
        <Link to={`/campaigns/${row.original.campaignId}`} className="text-xs text-[var(--color-primary)] hover:underline">
          {row.original.campaignName ?? `#${row.original.campaignId}`}
        </Link>
      ) : "—",
  },
  {
    accessorKey: "audience",
    header: "Audience",
    cell: ({ row }) => <span className="text-xs text-[var(--color-muted-fg)] max-w-[200px] truncate block">{row.original.audience ?? "—"}</span>,
  },
  {
    accessorKey: "placement",
    header: "Placement",
    cell: ({ row }) => <span className="text-xs">{row.original.placement ?? "—"}</span>,
  },
  {
    accessorKey: "optimizationGoal",
    header: "Goal",
    cell: ({ row }) => <Badge variant="outline">{row.original.optimizationGoal ?? "—"}</Badge>,
  },
  {
    accessorKey: "budget",
    header: "Budget",
    cell: ({ row }) => <span className="text-right block">{row.original.budget ? formatCurrency(parseFloat(row.original.budget)) : "—"}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.status === "active" ? "success" : "muted"}>{row.original.status}</Badge>,
  },
  {
    accessorKey: "startDate",
    header: "Start",
    cell: ({ row }) => <span className="text-xs">{row.original.startDate ?? "—"}</span>,
  },
];

export default function AdsetsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["adsets-list"],
    queryFn: () => api.get<AdSetRow[]>("/api/campaigns/adsets"),
  });

  return (
    <div>
      <PageHeader title="Ad Sets" description="All ad sets across campaigns." />
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Search ad sets…"
        exportFilename="adsets.csv"
        isLoading={isLoading}
        emptyMessage="No ad sets found."
        pageSize={60}
      />
    </div>
  );
}
