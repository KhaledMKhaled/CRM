import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  MessageCircle,
  Megaphone,
  Mail,
  Webhook,
  Phone,
  Sheet,
  Hash,
  ExternalLink,
} from "lucide-react";

interface Integration {
  key: string;
  icon: any;
  name: string;
  desc: string;
  status: "active" | "available" | "coming_soon";
  lastSync?: string;
  apiKeyLabel?: string;
  docsUrl?: string;
}

const ITEMS: Integration[] = [
  {
    key: "import_xlsx",
    icon: FileSpreadsheet,
    name: "XLSX / CSV import",
    desc: "Bulk upload Meta performance, campaigns, and prospects via Import Wizard.",
    status: "active",
    lastSync: "On every wizard commit",
  },
  {
    key: "meta_manual",
    icon: Megaphone,
    name: "Meta Ads (manual export)",
    desc: "Daily performance imported via XLSX export from Meta Ads Manager.",
    status: "active",
    lastSync: "Latest /api/meta/daily row date",
  },
  {
    key: "meta_api",
    icon: Megaphone,
    name: "Meta Marketing API",
    desc: "Pull ad performance and lead-form events directly from Meta Business once an access token is configured.",
    status: "available",
    apiKeyLabel: "Meta access token",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis/",
  },
  {
    key: "whatsapp",
    icon: MessageCircle,
    name: "WhatsApp Business Cloud API",
    desc: "Connect WhatsApp Cloud API for inbound conversation tracking and outbound replies.",
    status: "available",
    apiKeyLabel: "WhatsApp permanent token",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  },
  {
    key: "google_sheets",
    icon: Sheet,
    name: "Google Sheets",
    desc: "Two-way sync between Mofawtar and Google Sheets for ad-hoc reporting.",
    status: "available",
    apiKeyLabel: "OAuth client ID",
    docsUrl: "https://developers.google.com/sheets/api",
  },
  {
    key: "smtp",
    icon: Mail,
    name: "Email (SMTP / SendGrid)",
    desc: "Send transactional notifications when leads change stage or tasks come due.",
    status: "available",
    apiKeyLabel: "SMTP password / API key",
  },
  {
    key: "twilio",
    icon: Phone,
    name: "SMS (Twilio)",
    desc: "Send SMS reminders to prospects and reps.",
    status: "available",
    apiKeyLabel: "Twilio auth token",
    docsUrl: "https://www.twilio.com/docs/sms",
  },
  {
    key: "slack",
    icon: Hash,
    name: "Slack notifications",
    desc: "Post deal-won and high-value lead alerts to a Slack channel.",
    status: "available",
    apiKeyLabel: "Incoming webhook URL",
    docsUrl: "https://api.slack.com/messaging/webhooks",
  },
  {
    key: "webhooks",
    icon: Webhook,
    name: "Outgoing webhooks",
    desc: "Push lead, deal, and stage-change events to external systems in real time.",
    status: "coming_soon",
  },
];

const statusVariant: Record<Integration["status"], "success" | "warn" | "muted"> = {
  active: "success",
  available: "warn",
  coming_soon: "muted",
};
const statusLabel: Record<Integration["status"], string> = {
  active: "Active",
  available: "Available",
  coming_soon: "Coming soon",
};

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Data sources and external systems that feed (or could feed) Mofawtar. Active integrations appear at the top."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ITEMS.sort((a, b) => {
          const order = { active: 0, available: 1, coming_soon: 2 };
          return order[a.status] - order[b.status];
        }).map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="truncate">{item.name}</CardTitle>
                  </div>
                  <Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge>
                </div>
                <CardDescription className="line-clamp-3">{item.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.lastSync && (
                  <div className="text-xs text-[var(--color-muted-fg)]">
                    <span className="font-medium text-[var(--color-fg)]">Last sync:</span> {item.lastSync}
                  </div>
                )}
                {item.apiKeyLabel && item.status === "available" && (
                  <div>
                    <Label className="text-xs">{item.apiKeyLabel}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="password"
                        placeholder="Paste credential…"
                        value={keys[item.key] ?? ""}
                        onChange={(e) => setKeys((k) => ({ ...k, [item.key]: e.target.value }))}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!keys[item.key]}
                        onClick={() => alert(`Connection placeholder — credential captured locally only.\nFor real use, configure the ${item.name} integration on the server.`)}
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                )}
                {item.docsUrl && (
                  <a
                    href={item.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                  >
                    Docs <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {item.status === "coming_soon" && (
                  <div className="text-xs text-[var(--color-muted-fg)]">
                    Planned for a future release.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
