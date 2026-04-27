import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface ParsedFile {
  headers: string[];
  sampleRows: any[];
  totalRows: number;
  fileName: string;
  raw: any[];
}

export default function ImportWizardPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    },
    onError: (e: any) => setError(e.message),
  });

  const commitMut = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("No file parsed");
      const r = await fetch("/api/meta/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: parsed.raw, fileName: parsed.fileName, autoCreateEntities: true }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Commit failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setParsed(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => setError(e.message),
  });

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setError(null);
      parseMut.mutate(f);
    }
  }

  return (
    <div>
      <PageHeader title="Import Wizard" description="Upload XLSX or CSV files to bulk-import Meta daily performance." />

      <Card className="mb-4">
        <CardHeader><CardTitle>1. Upload file</CardTitle></CardHeader>
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
          {error && <div className="rounded-md bg-[var(--color-danger)]/10 p-2 text-sm text-[var(--color-danger)] flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
        </CardContent>
      </Card>

      {parsed && (
        <Card className="mb-4">
          <CardHeader><CardTitle>2. Preview & commit</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div><span className="text-[var(--color-muted-fg)]">File:</span> <span className="font-medium">{parsed.fileName}</span></div>
              <div><span className="text-[var(--color-muted-fg)]">Rows:</span> <span className="font-medium">{parsed.totalRows}</span></div>
              <div><span className="text-[var(--color-muted-fg)]">Columns:</span> <span className="font-medium">{parsed.headers.length}</span></div>
              <div className="flex-1" />
              <Button onClick={() => commitMut.mutate()} disabled={commitMut.isPending || parsed.totalRows === 0}>
                <Upload className="h-4 w-4" /> {commitMut.isPending ? "Importing…" : `Import ${parsed.totalRows} rows`}
              </Button>
            </div>
            <div className="overflow-auto border rounded-md max-h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parsed.headers.map((f) => <TableHead key={f}>{f}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.sampleRows.map((r: any, i: number) => (
                    <TableRow key={i}>
                      {parsed.headers.map((f: string) => <TableCell key={f} className="text-xs whitespace-nowrap">{String(r[f] ?? "")}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {commitMut.isSuccess && (
        <Card className="border-[var(--color-success)]">
          <CardContent className="p-4 text-sm text-[var(--color-success)] space-y-1">
            <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> Import complete</div>
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
