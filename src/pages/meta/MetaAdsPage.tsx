import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDateRange } from "@/hooks/useDateRange";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/utils";
import { Download } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@shared/calculations";

export default function MetaAdsPage() {
  const { range, setRange, presets } = useDateRange();
  const meta = useQuery({
    queryKey: ["meta-perf", range],
    queryFn: () => api.get<any[]>(`/api/meta/daily?from=${range.from}&to=${range.to}`),
  });
  const rows = meta.data ?? [];
  return (
    <div>
      <PageHeader
        title="Meta Ads daily performance"
        description="Imported daily performance per campaign / ad set / ad."
        actions={
          <div className="flex gap-2">
            <DateRangePicker value={range} onChange={setRange} presets={presets} />
            <Button variant="outline" onClick={() => downloadCsv(rows, `meta-perf-${range.from}-${range.to}.csv`)}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Ad set</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((r: any) => {
                const spend = parseFloat(r.amountSpent ?? "0");
                const conv = r.messagingConversationsStarted ?? 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.campaignName}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{r.adsetName}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{r.adName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(spend)}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.impressions)}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.clicks)}</TableCell>
                    <TableCell className="text-right text-xs">{formatPercent(r.impressions ? r.clicks / r.impressions : 0, 2)}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(r.clicks ? spend / r.clicks : 0)}</TableCell>
                    <TableCell className="text-right">{formatNumber(conv)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length > 200 && <div className="p-3 text-xs text-center text-[var(--color-muted-fg)]">Showing first 200 of {rows.length} rows. Export CSV for full data.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
