import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const stages = useQuery({ queryKey: ["s-stages"], queryFn: () => api.get<any[]>(`/api/settings/lead-stages`) });
  const products = useQuery({ queryKey: ["s-products"], queryFn: () => api.get<any[]>(`/api/settings/products`) });
  const channels = useQuery({ queryKey: ["s-channels"], queryFn: () => api.get<any[]>(`/api/settings/channels`) });
  const cfg = useQuery({ queryKey: ["s-cfg"], queryFn: () => api.get<any>(`/api/settings/config`) });

  return (
    <div>
      <PageHeader title="Settings" description="System configuration: stages, products, channels, KPI targets, scoring." />
      <Tabs defaultValue="stages">
        <TabsList>
          <TabsTrigger value="stages">Lead stages</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="kpis">KPI Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <Card><CardHeader><CardTitle>Lead stages</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {(stages.data ?? []).slice().sort((a, b) => a.stageOrder - b.stageOrder).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.stageOrder}</TableCell>
                    <TableCell className="font-medium">{s.stageName}</TableCell>
                    <TableCell><Badge variant={s.stageType === "won" ? "success" : s.stageType === "lost" ? "danger" : "info"}>{s.stageType ?? "active"}</Badge></TableCell>
                    <TableCell>{s.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="products">
          <Card><CardHeader><CardTitle>Products</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Billing</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {(products.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.productCategory ?? "—"}</TableCell>
                    <TableCell className="text-right">{p.price ? `${parseFloat(p.price).toLocaleString()} EGP` : "—"}</TableCell>
                    <TableCell>{p.billingCycle ?? "—"}</TableCell>
                    <TableCell>{p.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="channels">
          <Card><CardHeader><CardTitle>Channels & sources</CardTitle></CardHeader><CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Description</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {(channels.data ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="info">{c.channelName}</Badge></TableCell>
                    <TableCell className="text-xs text-[var(--color-muted-fg)]">{c.description ?? "—"}</TableCell>
                    <TableCell>{c.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="kpis">
          <Card><CardHeader><CardTitle>System config</CardTitle></CardHeader><CardContent>
            {cfg.data && (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="info">Currency: {cfg.data.currency}</Badge>
                  {cfg.data.counts && Object.entries(cfg.data.counts).map(([k, v]) => (
                    <Badge key={k} variant="muted">{k}: {String(v)}</Badge>
                  ))}
                </div>
                {cfg.data.kpis?.length > 0 && (
                  <div>
                    <div className="font-semibold mb-2">KPI definitions</div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Name</TableHead><TableHead>Formula</TableHead><TableHead>Format</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {cfg.data.kpis.map((k: any) => (
                          <TableRow key={k.id}>
                            <TableCell className="font-mono text-xs">{k.kpiKey}</TableCell>
                            <TableCell>{k.kpiName}</TableCell>
                            <TableCell className="text-xs text-[var(--color-muted-fg)]">{k.formula ?? "—"}</TableCell>
                            <TableCell><Badge variant="outline">{k.formatType ?? "number"}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
