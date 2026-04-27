// Centralized permission keys

export const PERMISSIONS = {
  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",

  // Campaigns
  CAMPAIGNS_VIEW: "campaigns.view",
  CAMPAIGNS_CREATE: "campaigns.create",
  CAMPAIGNS_EDIT: "campaigns.edit",
  CAMPAIGNS_DELETE: "campaigns.delete",
  CAMPAIGNS_COST_VIEW: "campaigns.cost.view",

  // Leads
  LEADS_VIEW_ALL: "leads.view_all",
  LEADS_VIEW_ASSIGNED: "leads.view_assigned",
  LEADS_CREATE: "leads.create",
  LEADS_EDIT: "leads.edit",
  LEADS_DELETE: "leads.delete",
  LEADS_ASSIGN: "leads.assign",
  LEADS_PERSONAL_DATA_VIEW: "leads.personal_data.view",

  // Deals
  DEALS_VIEW: "deals.view",
  DEALS_CREATE: "deals.create",
  DEALS_EDIT: "deals.edit",
  DEALS_REVENUE_VIEW: "deals.revenue.view",

  // Reports
  REPORTS_ADMIN_VIEW: "reports.admin.view",
  REPORTS_SALES_VIEW: "reports.sales.view",
  REPORTS_MEDIA_VIEW: "reports.media.view",

  // Imports / Exports
  IMPORTS_CREATE: "imports.create",
  EXPORTS_CREATE: "exports.create",

  // Settings managers
  CUSTOM_FIELDS_MANAGE: "custom_fields.manage",
  KPI_MANAGE: "kpi.manage",
  SLA_MANAGE: "sla.manage",

  // Audit
  AUDIT_VIEW: "audit.view",

  // Meta Ads
  META_ADS_VIEW: "meta_ads.view",
  META_ADS_EDIT: "meta_ads.edit",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

// Default role permission sets
export const ADMIN_PERMISSIONS: PermissionKey[] = ALL_PERMISSIONS;

export const SALES_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.LEADS_VIEW_ASSIGNED,
  PERMISSIONS.LEADS_VIEW_ALL,
  PERMISSIONS.LEADS_CREATE,
  PERMISSIONS.LEADS_EDIT,
  PERMISSIONS.LEADS_PERSONAL_DATA_VIEW,
  PERMISSIONS.DEALS_VIEW,
  PERMISSIONS.DEALS_CREATE,
  PERMISSIONS.DEALS_EDIT,
  PERMISSIONS.DEALS_REVENUE_VIEW,
  PERMISSIONS.REPORTS_SALES_VIEW,
  PERMISSIONS.CAMPAIGNS_VIEW,
  PERMISSIONS.EXPORTS_CREATE,
  PERMISSIONS.META_ADS_VIEW,
];

export const MEDIA_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.CAMPAIGNS_VIEW,
  PERMISSIONS.CAMPAIGNS_CREATE,
  PERMISSIONS.CAMPAIGNS_EDIT,
  PERMISSIONS.CAMPAIGNS_COST_VIEW,
  PERMISSIONS.META_ADS_VIEW,
  PERMISSIONS.META_ADS_EDIT,
  PERMISSIONS.REPORTS_MEDIA_VIEW,
  PERMISSIONS.LEADS_VIEW_ALL, // aggregated quality outcomes
  PERMISSIONS.DEALS_VIEW,
  PERMISSIONS.DEALS_REVENUE_VIEW,
  PERMISSIONS.IMPORTS_CREATE,
  PERMISSIONS.EXPORTS_CREATE,
];

export const ROLES = {
  ADMIN: "Admin",
  SALES: "Sales Execution",
  MEDIA: "Media Buyer",
} as const;

// All permission keys — used by the Roles & Permissions editor UI
export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

