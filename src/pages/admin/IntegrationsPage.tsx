import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, MessageCircle, Megaphone } from "lucide-react";

const items = [
  { icon: FileSpreadsheet, name: "XLSX / CSV import", desc: "Bulk upload Meta performance, campaigns, and prospects via Import Wizard.", status: "Active" },
  { icon: Megaphone, name: "Meta Ads (manual export)", desc: "Daily performance imported via XLSX export from Meta Ads Manager.", status: "Active" },
  { icon: MessageCircle, name: "WhatsApp Business API", desc: "Connect WhatsApp Cloud API for inbound conversation tracking.", status: "Available" },
];

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader title="Integrations" description="Data sources and external systems connected to Mofawtar." />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <Card key={i.name}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center"><Icon className="h-5 w-5" /></div>
                    <CardTitle>{i.name}</CardTitle>
                  </div>
                  <Badge variant={i.status === "Active" ? "success" : "muted"}>{i.status}</Badge>
                </div>
                <CardDescription>{i.desc}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
