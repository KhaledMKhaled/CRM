import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Filter,
  Activity,
  CheckSquare,
  Briefcase,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Database,
  PlugZap,
  Boxes,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS } from "@shared/permissions";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  perm?: string | string[];
  section?: string;
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },

  { to: "/leads", label: "Leads", icon: Users, perm: [PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED], section: "CRM" },
  { to: "/pipeline", label: "Pipeline", icon: Filter, perm: [PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED] },
  { to: "/activities", label: "Activities", icon: Activity, perm: [PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED] },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, perm: [PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED] },
  { to: "/deals", label: "Deals", icon: Briefcase, perm: PERMISSIONS.DEALS_VIEW },

  { to: "/meta-ads", label: "Meta Ads", icon: Megaphone, perm: PERMISSIONS.META_ADS_VIEW, section: "Marketing" },
  { to: "/campaigns", label: "Campaigns", icon: Boxes, perm: PERMISSIONS.CAMPAIGNS_VIEW },
  { to: "/imports", label: "Import Wizard", icon: FileSpreadsheet, perm: PERMISSIONS.IMPORTS_CREATE },

  { to: "/reports", label: "Reports", icon: BarChart3, perm: [PERMISSIONS.REPORTS_ADMIN_VIEW, PERMISSIONS.REPORTS_SALES_VIEW, PERMISSIONS.REPORTS_MEDIA_VIEW], section: "Analytics" },

  { to: "/settings", label: "Settings", icon: Settings, perm: PERMISSIONS.SETTINGS_VIEW, section: "Admin" },
  { to: "/users", label: "Users & Roles", icon: ShieldCheck, perm: PERMISSIONS.USERS_VIEW },
  { to: "/data-quality", label: "Data Quality", icon: ClipboardList, perm: PERMISSIONS.SETTINGS_VIEW },
  { to: "/audit", label: "Audit Log", icon: Database, perm: PERMISSIONS.AUDIT_VIEW },
  { to: "/integrations", label: "Integrations", icon: PlugZap, perm: PERMISSIONS.SETTINGS_VIEW },
];

export function Sidebar() {
  const { user, hasPermission } = useAuth();
  if (!user) return null;
  const allowed = NAV.filter((n) => !n.perm || hasPermission(n.perm));

  let lastSection = "";
  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r bg-white">
      <div className="flex items-center gap-2 px-5 py-4 border-b">
        <div className="h-8 w-8 rounded-md bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-sm">M</div>
        <div>
          <div className="text-sm font-semibold leading-tight">Mofawtar</div>
          <div className="text-[10px] text-[var(--color-muted-fg)] leading-tight">CRM • Attribution • ROAS</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {allowed.map((item) => {
          const Icon = item.icon;
          const showSection = item.section && item.section !== lastSection;
          if (showSection) lastSection = item.section!;
          return (
            <div key={item.to}>
              {showSection && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-fg)]">
                  {item.section}
                </div>
              )}
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "text-[var(--color-fg)]/80 hover:bg-[var(--color-muted)] hover:text-[var(--color-fg)]"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-3 text-xs text-[var(--color-muted-fg)]">
        <div className="truncate font-semibold text-[var(--color-fg)]">{user.name}</div>
        <div className="truncate">{user.roleName}</div>
      </div>
    </aside>
  );
}
