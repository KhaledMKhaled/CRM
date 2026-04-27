import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b bg-white px-6">
      <div className="text-sm text-[var(--color-muted-fg)]">
        Welcome back, <span className="font-semibold text-[var(--color-fg)]">{user.name.split(" ")[0]}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right text-xs sm:block">
          <div className="font-semibold">{user.name}</div>
          <div className="text-[var(--color-muted-fg)]">{user.email}</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
