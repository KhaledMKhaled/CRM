// useHasPermission – standalone hook for conditional UI hiding
import { useAuth } from "@/contexts/AuthContext";

export function useHasPermission(key: string | string[]): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(key);
}
