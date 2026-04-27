import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info" | "warn";
}

interface ToastCtx {
  toasts: Toast[];
  toast: (msg: string, type?: Toast["type"]) => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg cursor-pointer transition-all
              ${t.type === "success" ? "bg-[var(--color-success)] text-white" :
                t.type === "error" ? "bg-[var(--color-danger)] text-white" :
                t.type === "warn" ? "bg-[var(--color-warn)] text-white" :
                "bg-[var(--color-card)] text-[var(--color-fg)] border border-[var(--color-border)]"}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastProvider missing");
  return v.toast;
}
