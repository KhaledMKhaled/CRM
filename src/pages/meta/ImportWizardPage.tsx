import { useState, useRef, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface ParsedFile {
  headers: string[];
  sampleRows: any[];
  totalRows: number;
  fileName: string;
  raw: any[];
}

// Canonical field definitions — must match server/routes/meta.ts COL_* arrays.
const CANONICAL_FIELDS: { key: string; label: string; required?: boolean; aliases: string[] }[] = [
  { key: "Date", label: "Date", required: true, aliases: ["Day", "Date", "Reporting starts", "date", "day"] },
  { key: "Campaign name", label: "Campaign name", aliases: ["Campaign name", "Campaign Name", "campaign_name", "Campaign"] },
  { key: "Ad set name", label: "Ad set name", aliases: ["Ad set name", "Ad Set Name", "Adset Name", "adset_name", "Ad Set"] },
  { key: "Ad name", label: "Ad name", aliases: ["Ad name", "Ad Name", "ad_name", "Ad"] },
  { key: "Amount spent (EGP)", label: "Amount spent", aliases: ["Amount spent (EGP)", "Amount spent (USD)", "Amount spent", "Spend", "amount_spent"] },
  { key: "Impressions", label: "Impressions", aliases: ["Impressions", "impressions"] },
  { key: "Reach", label: "Reach", aliases: ["Reach", "reach"] },
  { key: "Clicks", label: "Clicks (all)", aliases: ["Clicks (all)", "Clicks", "clicks"] },
  { key: "Link clicks", label: "Link clicks", aliases: ["Link clicks", "link_clicks"] },
  { key: "Messaging conversations started", label: "Messaging conversations started", aliases: ["Messaging conversations started", "Conversations started", "messaging_conversations_started"] },
  { key: "Meta leads", label: "Meta leads", aliases: ["Meta leads", "Leads", "leads"] },
  { key: "Purchases", label: "Purchases", aliases: ["Purchases", "purchases"] },
  { key: "Website registrations completed", label: "Website registrations", aliases: ["Website registrations completed", "Registrations completed", "Website registrations"] },
  { key: "Campaign objective", label: "Campaign objective", aliases: ["Campaign objective", "Objective", "objective"] },
];

function autoDetect(headers: string[]): Record<string, string> {
  const lc = new Map(headers.map((h) => [h.toLowerCase().trim(), h]));
  const map: Record<string, string> = {};
  for (const f of CANONICAL_FIELDS) {
    for (const alias of f.aliases) {
      const m = lc.get(alias.toLowerCase());
      if (m) { map[f.key] = m; break; }
    }
  }
  return map;
}

function validateRows(rows: any[], mapping: Record<string, string>): { valid: number; invalid: number; reasons: Map<string, number> } {
  const reasons = new Map<string, number>();
  let valid = 0, invalid = 0;
  const dateCol = mapping["Date"];
  const spendCol = mapping["Amount spent (EGP)"];
  const sample = rows.slice(0, Math.min(rows.length, 1000));
  for (const r of sample) {
    let bad = false;
    if (!dateCol || !r[dateCol]) {
      reasons.set("Missing date", (reasons.get("Missing date") ?? 0) + 1);
      bad = true;
    } else if (isNaN(new Date(String(r[dateCol])).getTime())) {
      reasons.set("Unparseable date", (reasons.get("Unparseable date") ?? 0) + 1);
      bad = true;
    }
    if (spendCol && r[spendCol] != null && r[spendCol] !== "") {
      const n = parseFloat(String(r[spendCol]).replace(/[, ]/g, ""));
      if (isNaN(n) || n < 0) {
        reasons.set("Invalid spend", (reasons.get("Invalid spend") ?? 0) + 1);
        bad = true;
      }
    }
    if (bad) invalid++; else valid++;
  }
  // Extrapolate: assume same ratio across full dataset.
  if (rows.length > sample.length) {
    const factor = rows.length / sample.length;
    valid = Math.round(valid * factor);
    invalid = Math.round(invalid * factor);
    for (const k of reasons.keys()) reasons.set(k, Math.round(reasons.get(k)! * factor));
  }
  return { valid, invalid, reasons };
}

export default function ImportWizardPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");

  const parseMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/meta/import/parse", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error((await r.json()).error || "Parse failed");
      return (await r.json()) as ParsedFile;
    },
    onSuccess: (d) => {
      setParsed(d);
      setMapping(autoDetect(d.headers));
      setStep("map");
      setError(null);
    },
    onError: (e: any) => setError(e.message),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("No file parsed");
      // Re-key each row using the mapping so server canonical column matchers find them.
      const remapped = parsed.raw.map((row) => {
        const out: Record<string, any> = {};
        // Keep original columns too (so nothing is silently dropped) ...
        Object.assign(out, row);
        // ... then overlay canonical names mapping the user picked
        for (const [canonical, source] of Object.entries(mapping)) {
          if (source && source in row) out[canonical] = row[source];
        }
        return out;
      });
      const r = await fetch("/api/meta/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: remapped, fileName: parsed.fileName, autoCreateEntities: true }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Commit failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setParsed(null);
      setStep("upload");
      setMapping({});
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => setError(e.message),
  });

  const requiredMissing = useMemo(
    () => CANONICAL_FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.label),
    [mapping]
  );

  const validation = useMemo(
    () => (parsed ? validateRows(parsed.raw, mapping) : null),
    [parsed, mapping]
  );

  useEffect(() => {
    setError(null);
  }, [step]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setError(null);
      parseMut.mutate(f);
    }
  }

  function reset() {
    setParsed(null);
    setMapping({});
    setStep("upload");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <PageHeader
        title="Import Wizard"
        description="Upload XLSX or CSV files to bulk-import Meta daily performance. Three steps: upload, map columns, and commit."
      />

      <ol className="flex items-center gap-2 text-xs mb-4">
        {(["upload", "map", "preview"] as const).map((s, i) => {
          const active = step === s;
          const done = ["upload", "map", "preview"].indexOf(step) > i;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  active
                    ? "bg-[var(--color-primary)] text-white"
                    : done
                    ? "bg-[var(--color-success)] text-white"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-fg)]"
                }`}
              >
                {i + 1}
              </span>
              <span className={active ? "font-semibold" : "text-[var(--color-muted-fg)]"}>
                {s === "upload" ? "Upload" : s === "map" ? "Map columns" : "Preview & commit"}
              </span>
              {i < 2 && <ArrowRight className="h-3 w-3 text-[var(--color-muted-fg)]" />}
            </li>
          );
        })}
      </ol>

      {step === "upload" && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>1. Upload file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>File (.xlsx or .csv)</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onPick}
                className="block w-full text-sm rounded-md border border-[var(--color-input)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1.5 file:text-white"
              />
            </div>
            {parseMut.isPending && <div className="text-sm text-[var(--color-muted-fg)]">Parsing…</div>}
            {error && (
              <div className="rounded-md bg-[var(--color-danger)]/10 p-2 text-sm text-[var(--color-danger)] flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === "map" && parsed && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>2. Map your columns to Mofawtar fields</CardTitle>
            <p className="text-xs text-[var(--color-muted-fg)] mt-1">
              We auto-detected the columns below. Adjust any that look wrong, then continue.
              Required fields are marked with <Badge variant="danger" className="!text-[10px]">required</Badge>.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              {CANONICAL_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="w-56 text-xs flex items-center gap-2">
                    {f.label}
                    {f.required && <Badge variant="danger" className="!text-[9px]">required</Badge>}
                  </Label>
                  <select
                    className="flex-1 rounded-md border border-[var(--color-input)] bg-white text-xs px-2 py-1.5"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                  >
                    <option value="">— skip —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {requiredMissing.length > 0 && (
              <div className="rounded-md bg-[var(--color-warn)]/10 p-2 text-xs text-[var(--color-warn-fg,_var(--color-fg))] flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Required fields not mapped: {requiredMissing.join(", ")}
              </div>
            )}
            {validation && (
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                <div className="rounded-md border p-2">
                  <div className="text-[var(--color-muted-fg)]">Rows ready to import</div>
                  <div className="text-lg font-semibold text-[var(--color-success)]">{validation.valid.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[var(--color-muted-fg)]">Rows that will be skipped</div>
                  <div className="text-lg font-semibold text-[var(--color-danger)]">{validation.invalid.toLocaleString()}</div>
                </div>
                <div className="rounded-md border p-2">
                  <div className="text-[var(--color-muted-fg)]">Top reasons</div>
                  <div className="text-[11px] mt-1 space-y-0.5">
                    {[...validation.reasons.entries()].slice(0, 3).map(([r, c]) => (
                      <div key={r}>• {r}: {c.toLocaleString()}</div>
                    ))}
                    {validation.reasons.size === 0 && <div className="text-[var(--color-muted-fg)]">None — looking great</div>}
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={reset}>Start over</Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={requiredMissing.length > 0}
              >
                Continue to preview <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && parsed && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>3. Preview & commit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div><span className="text-[var(--color-muted-fg)]">File:</span> <span className="font-medium">{parsed.fileName}</span></div>
              <div><span className="text-[var(--color-muted-fg)]">Rows:</span> <span className="font-medium">{parsed.totalRows.toLocaleString()}</span></div>
              <div><span className="text-[var(--color-muted-fg)]">Mapped fields:</span> <span className="font-medium">{Object.values(mapping).filter(Boolean).length}</span></div>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={() => commitMut.mutate()} disabled={commitMut.isPending || parsed.totalRows === 0}>
                <Upload className="h-4 w-4" /> {commitMut.isPending ? "Importing…" : `Import ${parsed.totalRows.toLocaleString()} rows`}
              </Button>
            </div>
            <div className="overflow-auto border rounded-md max-h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.entries(mapping)
                      .filter(([, src]) => !!src)
                      .map(([canonical]) => (
                        <TableHead key={canonical} className="whitespace-nowrap">{canonical}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.sampleRows.map((r: any, i: number) => (
                    <TableRow key={i}>
                      {Object.entries(mapping)
                        .filter(([, src]) => !!src)
                        .map(([canonical, src]) => (
                          <TableCell key={canonical} className="text-xs whitespace-nowrap">
                            {String(r[src] ?? "")}
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {error && (
              <div className="rounded-md bg-[var(--color-danger)]/10 p-2 text-sm text-[var(--color-danger)] flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {commitMut.isSuccess && (
        <Card className="border-[var(--color-success)]">
          <CardContent className="p-4 text-sm text-[var(--color-success)] space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" /> Import complete
            </div>
            <div className="text-[var(--color-fg)] text-xs">
              {commitMut.data?.inserted ?? 0} inserted · {commitMut.data?.updated ?? 0} updated · {commitMut.data?.skipped ?? 0} skipped
              {commitMut.data?.campaignsCreated ? ` · ${commitMut.data.campaignsCreated} campaigns created` : ""}
              {commitMut.data?.adsetsCreated ? ` · ${commitMut.data.adsetsCreated} ad sets created` : ""}
              {commitMut.data?.adsCreated ? ` · ${commitMut.data.adsCreated} ads created` : ""}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
