import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roleId: number | null;
  roleName: string | null;
  permissions: string[];
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (key: string | string[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuthUser>("/api/auth/me")
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const u = await api.post<AuthUser>("/api/auth/login", { email, password });
    setUser(u);
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  };

  const hasPermission = (key: string | string[]) => {
    if (!user) return false;
    const keys = Array.isArray(key) ? key : [key];
    return keys.some((k) => user.permissions.includes(k));
  };

  return <Ctx.Provider value={{ user, loading, login, logout, hasPermission }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
