import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

interface AdRow {
  id: number;
  adName: string;
  campaignId?: number | null;
  campaignName?: string;
  adsetId?: number | null;
  adsetName?: string;
  creativeName?: string | null;
  creativeType?: string | null;
  headline?: string | null;
  cta?: string | null;
  status: string;
}

const columns: ColumnDef<AdRow, any>[] = [
  {
    accessorKey: "adName",
    header: "Ad",
    cell: ({ row }) => (
      <Link to={`/ads/${row.original.id}`} className="text-[var(--color-primary)] hover:underline font-medium">
        {row.original.adName}
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
    accessorKey: "adsetName",
    header: "Ad Set",
    cell: ({ row }) =>
      row.original.adsetId ? (
        <Link to={`/adsets/${row.original.adsetId}`} className="text-xs text-[var(--color-primary)] hover:underline">
          {row.original.adsetName ?? `#${row.original.adsetId}`}
        </Link>
      ) : "—",
  },
  {
    accessorKey: "creativeType",
    header: "Type",
    cell: ({ row }) => row.original.creativeType ? <Badge variant="outline">{row.original.creativeType}</Badge> : <span className="text-[var(--color-muted-fg)]">—</span>,
  },
  {
    accessorKey: "headline",
    header: "Headline",
    cell: ({ row }) => <span className="text-xs text-[var(--color-muted-fg)] max-w-[200px] truncate block">{row.original.headline ?? "—"}</span>,
  },
  {
    accessorKey: "cta",
    header: "CTA",
    cell: ({ row }) => <span className="text-xs">{row.original.cta ?? "—"}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.status === "active" ? "success" : "muted"}>{row.original.status}</Badge>,
  },
];

export default function AdsListPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["ads-list"],
    queryFn: () => api.get<AdRow[]>("/api/campaigns/ads"),
  });

  return (
    <div>
      <PageHeader title="Ads" description="All ads with creative details." />
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Search ads…"
        exportFilename="ads.csv"
        isLoading={isLoading}
        emptyMessage="No ads found."
        pageSize={60}
      />
    </div>
  );
}
