import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@shared/permissions";
import AdminDashboard from "@/pages/dashboards/AdminDashboard";
import SalesDashboard from "@/pages/dashboards/SalesDashboard";
import MediaDashboard from "@/pages/dashboards/MediaDashboard";

export default function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.roleName === ROLES.ADMIN) return <AdminDashboard />;
  if (user.roleName === ROLES.SALES) return <SalesDashboard />;
  if (user.roleName === ROLES.MEDIA) return <MediaDashboard />;
  return <AdminDashboard />;
}
