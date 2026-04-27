import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth, RequirePermission } from "@/components/RequirePermission";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/ui/toast";
import { PERMISSIONS } from "@shared/permissions";

import LoginPage from "@/pages/LoginPage";
import DashboardRouter from "@/pages/DashboardRouter";
import LeadsPage from "@/pages/crm/LeadsPage";
import LeadDetailPage from "@/pages/crm/LeadDetailPage";
import PipelinePage from "@/pages/crm/PipelinePage";
import ActivitiesPage from "@/pages/crm/ActivitiesPage";
import TasksPage from "@/pages/crm/TasksPage";
import DealsPage from "@/pages/crm/DealsPage";
import MetaAdsPage from "@/pages/meta/MetaAdsPage";
import CampaignsPage from "@/pages/meta/CampaignsPage";
import CampaignDetailPage from "@/pages/meta/CampaignDetailPage";
import AdsetDetailPage from "@/pages/meta/AdsetDetailPage";
import AdDetailPage from "@/pages/meta/AdDetailPage";
import AdsetsPage from "@/pages/meta/AdsetsPage";
import AdsListPage from "@/pages/meta/AdsListPage";
import ImportWizardPage from "@/pages/meta/ImportWizardPage";
import DealDetailPage from "@/pages/crm/DealDetailPage";
import AttributionPage from "@/pages/admin/AttributionPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import UsersPage from "@/pages/admin/UsersPage";
import DataQualityPage from "@/pages/admin/DataQualityPage";
import AuditLogPage from "@/pages/admin/AuditLogPage";
import IntegrationsPage from "@/pages/admin/IntegrationsPage";

function ShellRoute({ children, perm }: { children: React.ReactNode; perm?: string | string[] }) {
  return (
    <RequireAuth>
      <AppLayout>{perm ? <RequirePermission permission={perm}>{children}</RequirePermission> : children}</AppLayout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/" element={<ShellRoute><DashboardRouter /></ShellRoute>} />

              <Route path="/leads" element={<ShellRoute perm={[PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED]}><LeadsPage /></ShellRoute>} />
              <Route path="/leads/:id" element={<ShellRoute perm={[PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED]}><LeadDetailPage /></ShellRoute>} />
              {/* "Prospects" is the spec term; keep both URL forms */}
              <Route path="/prospects" element={<ShellRoute perm={[PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED]}><LeadsPage /></ShellRoute>} />
              <Route path="/prospects/:id" element={<ShellRoute perm={[PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED]}><LeadDetailPage /></ShellRoute>} />
              <Route path="/pipeline" element={<ShellRoute perm={[PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED]}><PipelinePage /></ShellRoute>} />
              <Route path="/activities" element={<ShellRoute perm={[PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED]}><ActivitiesPage /></ShellRoute>} />
              <Route path="/tasks" element={<ShellRoute perm={[PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED]}><TasksPage /></ShellRoute>} />
              <Route path="/deals" element={<ShellRoute perm={PERMISSIONS.DEALS_VIEW}><DealsPage /></ShellRoute>} />
              <Route path="/deals/:id" element={<ShellRoute perm={PERMISSIONS.DEALS_VIEW}><DealDetailPage /></ShellRoute>} />

              <Route path="/meta-ads" element={<ShellRoute perm={PERMISSIONS.META_ADS_VIEW}><MetaAdsPage /></ShellRoute>} />
              <Route path="/campaigns" element={<ShellRoute perm={PERMISSIONS.CAMPAIGNS_VIEW}><CampaignsPage /></ShellRoute>} />
              <Route path="/campaigns/:id" element={<ShellRoute perm={PERMISSIONS.CAMPAIGNS_VIEW}><CampaignDetailPage /></ShellRoute>} />
              {/* Dedicated Ad Sets page */}
              <Route path="/adsets" element={<ShellRoute perm={PERMISSIONS.CAMPAIGNS_VIEW}><AdsetsPage /></ShellRoute>} />
              <Route path="/adsets/:id" element={<ShellRoute perm={PERMISSIONS.CAMPAIGNS_VIEW}><AdsetDetailPage /></ShellRoute>} />
              {/* Dedicated Ads page */}
              <Route path="/ads" element={<ShellRoute perm={PERMISSIONS.CAMPAIGNS_VIEW}><AdsListPage /></ShellRoute>} />
              <Route path="/ads/:id" element={<ShellRoute perm={PERMISSIONS.CAMPAIGNS_VIEW}><AdDetailPage /></ShellRoute>} />
              <Route path="/imports" element={<ShellRoute perm={PERMISSIONS.IMPORTS_CREATE}><ImportWizardPage /></ShellRoute>} />
              <Route path="/attribution" element={<ShellRoute perm={PERMISSIONS.SETTINGS_VIEW}><AttributionPage /></ShellRoute>} />

              <Route path="/reports" element={<ShellRoute perm={[PERMISSIONS.REPORTS_ADMIN_VIEW, PERMISSIONS.REPORTS_SALES_VIEW, PERMISSIONS.REPORTS_MEDIA_VIEW]}><ReportsPage /></ShellRoute>} />

              <Route path="/settings" element={<ShellRoute perm={PERMISSIONS.SETTINGS_VIEW}><SettingsPage /></ShellRoute>} />
              <Route path="/users" element={<ShellRoute perm={PERMISSIONS.USERS_VIEW}><UsersPage /></ShellRoute>} />
              <Route path="/data-quality" element={<ShellRoute perm={PERMISSIONS.SETTINGS_VIEW}><DataQualityPage /></ShellRoute>} />
              <Route path="/audit" element={<ShellRoute perm={PERMISSIONS.AUDIT_VIEW}><AuditLogPage /></ShellRoute>} />
              <Route path="/integrations" element={<ShellRoute perm={PERMISSIONS.SETTINGS_VIEW}><IntegrationsPage /></ShellRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
