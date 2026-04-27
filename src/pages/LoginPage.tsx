import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@mofawtar.com");
  const [password, setPassword] = useState("Admin123456");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-11 w-11 rounded-md bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-lg">M</div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Mofawtar</h1>
            <p className="text-xs text-[var(--color-muted-fg)]">CRM • Marketing Attribution • ROAS Analytics</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use one of the demo credentials below to explore the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {error && (
                <div className="rounded-md bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <div className="mt-6 rounded-md border bg-[var(--color-muted)]/50 p-3 text-xs">
              <div className="mb-2 font-semibold">Demo accounts</div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between gap-2">
                  <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => { setEmail("admin@mofawtar.com"); setPassword("Admin123456"); }}>
                    admin@mofawtar.com
                  </button>
                  <span>Admin123456</span>
                </div>
                <div className="flex justify-between gap-2">
                  <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => { setEmail("sales@mofawtar.com"); setPassword("Sales123456"); }}>
                    sales@mofawtar.com
                  </button>
                  <span>Sales123456</span>
                </div>
                <div className="flex justify-between gap-2">
                  <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => { setEmail("media@mofawtar.com"); setPassword("Media123456"); }}>
                    media@mofawtar.com
                  </button>
                  <span>Media123456</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
