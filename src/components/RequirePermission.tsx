import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequirePermission({ permission, children }: { permission: string | string[]; children: ReactNode }) {
  const { hasPermission, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!hasPermission(permission)) return <NotAllowed />;
  return <>{children}</>;
}

function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-sm text-[var(--color-muted-fg)]">Loading…</div>
    </div>
  );
}

function NotAllowed() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
      <h2 className="text-lg font-semibold">Access denied</h2>
      <p className="text-sm text-[var(--color-muted-fg)]">You do not have permission to view this page.</p>
    </div>
  );
}
