import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@shared/calculations";
import { Link } from "react-router-dom";

function moneyOrDash(v: any) {
  const n = v == null ? null : parseFloat(v);
  return n != null && !isNaN(n) ? formatCurrency(n) : "—";
}

export default function CampaignsPage() {
  const camps = useQuery({ queryKey: ["campaigns"], queryFn: () => api.get<any[]>(`/api/campaigns`) });
  const adsets = useQuery({ queryKey: ["adsets"], queryFn: () => api.get<any[]>(`/api/campaigns/adsets`) });
  const adsList = useQuery({ queryKey: ["ads"], queryFn: () => api.get<any[]>(`/api/campaigns/ads`) });

  const campaignNameById = new Map<number, string>(
    (camps.data ?? []).map((c: any) => [c.id, c.campaignName])
  );
  const adsetNameById = new Map<number, string>(
    (adsets.data ?? []).map((a: any) => [a.id, a.adsetName])
  );

  return (
    <div>
      <PageHeader
        title="Campaigns, Ad Sets & Ads"
        description="Marketing campaign hierarchy with budgets, objectives, and platform IDs used for attribution."
      />
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns ({(camps.data ?? []).length})</TabsTrigger>
          <TabsTrigger value="adsets">Ad Sets ({(adsets.data ?? []).length})</TabsTrigger>
          <TabsTrigger value="ads">Ads ({(adsList.data ?? []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead>Buying type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead>Platform ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(camps.data ?? []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.campaignName}</TableCell>
                      <TableCell className="text-xs">{c.objective ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.buyingType ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "success" : "muted"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(c.startDate)}</TableCell>
                      <TableCell className="text-xs">{formatDate(c.endDate)}</TableCell>
                      <TableCell className="text-right">{moneyOrDash(c.budget)}</TableCell>
                      <TableCell className="text-xs font-mono text-[var(--color-muted-fg)]">
                        {c.platformCampaignId ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(camps.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-[var(--color-muted-fg)] py-6">
                        No campaigns. Use the <Link to="/imports" className="text-[var(--color-primary)] hover:underline">Import Wizard</Link> to load Meta data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adsets">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Optimization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead>Platform ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(adsets.data ?? []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.adsetName}</TableCell>
                      <TableCell className="text-xs">{campaignNameById.get(a.campaignId) ?? "—"}</TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate">{a.audience ?? "—"}</TableCell>
                      <TableCell className="text-xs">{a.placement ?? "—"}</TableCell>
                      <TableCell className="text-xs">{a.optimizationGoal ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "active" ? "success" : "muted"}>{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{moneyOrDash(a.budget)}</TableCell>
                      <TableCell className="text-xs font-mono text-[var(--color-muted-fg)]">
                        {a.platformAdsetId ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(adsets.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-[var(--color-muted-fg)] py-6">
                        No ad sets.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Ad Set</TableHead>
                    <TableHead>Creative type</TableHead>
                    <TableHead>CTA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Platform ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(adsList.data ?? []).map((ad: any) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium max-w-[260px] truncate">{ad.adName}</TableCell>
                      <TableCell className="text-xs">{campaignNameById.get(ad.campaignId) ?? "—"}</TableCell>
                      <TableCell className="text-xs">{adsetNameById.get(ad.adsetId) ?? "—"}</TableCell>
                      <TableCell className="text-xs">{ad.creativeType ?? "—"}</TableCell>
                      <TableCell className="text-xs">{ad.cta ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={ad.status === "active" ? "success" : "muted"}>{ad.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[var(--color-muted-fg)]">
                        {ad.platformAdId ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(adsList.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-[var(--color-muted-fg)] py-6">
                        No ads.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="px-3 py-2 text-xs text-[var(--color-muted-fg)] border-t">
                Showing {formatNumber((adsList.data ?? []).length)} ads.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
