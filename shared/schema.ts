import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// =====================================================
// ROLES & USERS
// =====================================================

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  description: text("description"),
  permissionsJson: jsonb("permissions_json").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    email: varchar("email", { length: 191 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    roleId: integer("role_id").references(() => roles.id),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    phone: varchar("phone", { length: 64 }),
    team: varchar("team", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => ({
    roleIdx: index("users_role_idx").on(t.roleId),
  })
);

// =====================================================
// CAMPAIGNS / AD SETS / ADS
// =====================================================

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  platformCampaignId: varchar("platform_campaign_id", { length: 128 }),
  campaignName: varchar("campaign_name", { length: 255 }).notNull(),
  objective: varchar("objective", { length: 64 }),
  buyingType: varchar("buying_type", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 14, scale: 2 }),
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adSets = pgTable(
  "ad_sets",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    platformAdsetId: varchar("platform_adset_id", { length: 128 }),
    adsetName: varchar("adset_name", { length: 255 }).notNull(),
    audience: text("audience"),
    placement: varchar("placement", { length: 128 }),
    optimizationGoal: varchar("optimization_goal", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    budget: numeric("budget", { precision: 14, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    campaignIdx: index("adsets_campaign_idx").on(t.campaignId),
  })
);

export const ads = pgTable(
  "ads",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    adsetId: integer("adset_id").references(() => adSets.id, { onDelete: "cascade" }),
    platformAdId: varchar("platform_ad_id", { length: 128 }),
    adName: varchar("ad_name", { length: 255 }).notNull(),
    creativeName: varchar("creative_name", { length: 255 }),
    creativeType: varchar("creative_type", { length: 64 }),
    primaryText: text("primary_text"),
    headline: text("headline"),
    cta: varchar("cta", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    campaignIdx: index("ads_campaign_idx").on(t.campaignId),
    adsetIdx: index("ads_adset_idx").on(t.adsetId),
  })
);

// =====================================================
// META DAILY PERFORMANCE
// =====================================================

export const metaDailyPerformance = pgTable(
  "meta_daily_performance",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    quarter: varchar("quarter", { length: 16 }), // 2026-Q2
    month: varchar("month", { length: 16 }),     // 2026-04
    week: varchar("week", { length: 16 }),       // 2026-W14
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    adsetId: integer("adset_id").references(() => adSets.id, { onDelete: "set null" }),
    adId: integer("ad_id").references(() => ads.id, { onDelete: "set null" }),
    channel: varchar("channel", { length: 64 }),
    amountSpent: numeric("amount_spent", { precision: 14, scale: 2 }).default("0"),
    impressions: integer("impressions").default(0),
    reach: integer("reach").default(0),
    frequency: numeric("frequency", { precision: 10, scale: 4 }).default("0"),
    clicks: integer("clicks").default(0),
    linkClicks: integer("link_clicks").default(0),
    landingPageViews: integer("landing_page_views").default(0),
    ctr: numeric("ctr", { precision: 10, scale: 6 }).default("0"),
    cpc: numeric("cpc", { precision: 12, scale: 4 }).default("0"),
    cpm: numeric("cpm", { precision: 12, scale: 4 }).default("0"),
    messagingConversationsStarted: integer("messaging_conversations_started").default(0),
    messengerConversations: integer("messenger_conversations").default(0),
    whatsappConversations: integer("whatsapp_conversations").default(0),
    instagramDmConversations: integer("instagram_dm_conversations").default(0),
    newMessagingContacts: integer("new_messaging_contacts").default(0),
    totalMessagingContacts: integer("total_messaging_contacts").default(0),
    messagingConversationsReplied: integer("messaging_conversations_replied").default(0),
    messengerCallsPlaced: integer("messenger_calls_placed").default(0),
    metaLeads: integer("meta_leads").default(0),
    websiteRegistrationsCompleted: integer("website_registrations_completed").default(0),
    purchases: integer("purchases").default(0),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dateIdx: index("meta_perf_date_idx").on(t.date),
    campaignIdx: index("meta_perf_campaign_idx").on(t.campaignId),
    adsetIdx: index("meta_perf_adset_idx").on(t.adsetId),
    adIdx: index("meta_perf_ad_idx").on(t.adId),
    monthIdx: index("meta_perf_month_idx").on(t.month),
    weekIdx: index("meta_perf_week_idx").on(t.week),
    quarterIdx: index("meta_perf_quarter_idx").on(t.quarter),
  })
);

// =====================================================
// LEAD STAGES / STATUSES / LOST REASONS / PRODUCTS
// =====================================================

export const leadStages = pgTable("lead_stages", {
  id: serial("id").primaryKey(),
  stageName: varchar("stage_name", { length: 64 }).notNull().unique(),
  stageOrder: integer("stage_order").notNull().default(0),
  stageType: varchar("stage_type", { length: 32 }).default("active"),
  isActive: boolean("is_active").notNull().default(true),
  isSystemDefault: boolean("is_system_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadStatuses = pgTable("lead_statuses", {
  id: serial("id").primaryKey(),
  statusName: varchar("status_name", { length: 64 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lostReasons = pgTable("lost_reasons", {
  id: serial("id").primaryKey(),
  reasonName: varchar("reason_name", { length: 128 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  productName: varchar("product_name", { length: 191 }).notNull(),
  productCategory: varchar("product_category", { length: 64 }),
  price: numeric("price", { precision: 14, scale: 2 }),
  billingCycle: varchar("billing_cycle", { length: 32 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  channelName: varchar("channel_name", { length: 64 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  typeName: varchar("type_name", { length: 64 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// PROSPECTS
// =====================================================

export const prospects = pgTable(
  "prospects",
  {
    id: serial("id").primaryKey(),
    prospectCode: varchar("prospect_code", { length: 32 }).notNull().unique(),
    firstName: varchar("first_name", { length: 128 }),
    lastName: varchar("last_name", { length: 128 }),
    fullName: varchar("full_name", { length: 255 }),
    phone: varchar("phone", { length: 64 }),
    email: varchar("email", { length: 191 }),
    companyName: varchar("company_name", { length: 191 }),
    jobTitle: varchar("job_title", { length: 128 }),
    industry: varchar("industry", { length: 128 }),
    city: varchar("city", { length: 128 }),
    country: varchar("country", { length: 128 }),
    channel: varchar("channel", { length: 64 }),
    source: varchar("source", { length: 128 }),
    utmSource: varchar("utm_source", { length: 128 }),
    utmMedium: varchar("utm_medium", { length: 128 }),
    utmCampaign: varchar("utm_campaign", { length: 191 }),
    utmContent: varchar("utm_content", { length: 191 }),
    utmTerm: varchar("utm_term", { length: 128 }),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    adsetId: integer("adset_id").references(() => adSets.id, { onDelete: "set null" }),
    adId: integer("ad_id").references(() => ads.id, { onDelete: "set null" }),
    campaignNameSnapshot: varchar("campaign_name_snapshot", { length: 255 }),
    adsetNameSnapshot: varchar("adset_name_snapshot", { length: 255 }),
    adNameSnapshot: varchar("ad_name_snapshot", { length: 255 }),
    isAttributed: boolean("is_attributed").notNull().default(false),
    firstContactDate: timestamp("first_contact_date", { withTimezone: true }),
    createdDate: timestamp("created_date", { withTimezone: true }).notNull().defaultNow(),
    assignedSalesId: integer("assigned_sales_id").references(() => users.id, { onDelete: "set null" }),
    leadStageId: integer("lead_stage_id").references(() => leadStages.id, { onDelete: "set null" }),
    leadStatusId: integer("lead_status_id").references(() => leadStatuses.id, { onDelete: "set null" }),
    leadQuality: varchar("lead_quality", { length: 32 }), // hot/warm/cold
    leadScore: integer("lead_score").default(0),
    customerType: varchar("customer_type", { length: 64 }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    productInterest: varchar("product_interest", { length: 191 }),
    notes: text("notes"),
    firstReplyAt: timestamp("first_reply_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    nextFollowupAt: timestamp("next_followup_at", { withTimezone: true }),
    mqlAt: timestamp("mql_at", { withTimezone: true }),
    sqlAt: timestamp("sql_at", { withTimezone: true }),
    wonAt: timestamp("won_at", { withTimezone: true }),
    lostAt: timestamp("lost_at", { withTimezone: true }),
    lostReasonId: integer("lost_reason_id").references(() => lostReasons.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    campaignIdx: index("prospects_campaign_idx").on(t.campaignId),
    adsetIdx: index("prospects_adset_idx").on(t.adsetId),
    adIdx: index("prospects_ad_idx").on(t.adId),
    salesIdx: index("prospects_sales_idx").on(t.assignedSalesId),
    stageIdx: index("prospects_stage_idx").on(t.leadStageId),
    createdIdx: index("prospects_created_idx").on(t.createdDate),
  })
);

// =====================================================
// DEALS / ACTIVITIES / TASKS
// =====================================================

export const deals = pgTable(
  "deals",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id").references(() => prospects.id, { onDelete: "cascade" }),
    dealName: varchar("deal_name", { length: 255 }),
    dealStage: varchar("deal_stage", { length: 64 }),
    expectedRevenue: numeric("expected_revenue", { precision: 14, scale: 2 }).default("0"),
    actualRevenue: numeric("actual_revenue", { precision: 14, scale: 2 }).default("0"),
    currency: varchar("currency", { length: 8 }).notNull().default("EGP"),
    probability: integer("probability").default(0),
    dealStatus: varchar("deal_status", { length: 32 }).notNull().default("open"), // open/won/lost
    closeDate: date("close_date"),
    wonDate: date("won_date"),
    lostDate: date("lost_date"),
    lostReasonId: integer("lost_reason_id").references(() => lostReasons.id, { onDelete: "set null" }),
    salesOwnerId: integer("sales_owner_id").references(() => users.id, { onDelete: "set null" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    campaignId: integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    adsetId: integer("adset_id").references(() => adSets.id, { onDelete: "set null" }),
    adId: integer("ad_id").references(() => ads.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    prospectIdx: index("deals_prospect_idx").on(t.prospectId),
    statusIdx: index("deals_status_idx").on(t.dealStatus),
    campaignIdx: index("deals_campaign_idx").on(t.campaignId),
  })
);

export const activities = pgTable(
  "activities",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id").references(() => prospects.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    activityDate: timestamp("activity_date", { withTimezone: true }).notNull().defaultNow(),
    activityType: varchar("activity_type", { length: 64 }).notNull(),
    activityChannel: varchar("activity_channel", { length: 64 }),
    activityOutcome: varchar("activity_outcome", { length: 64 }),
    notes: text("notes"),
    nextFollowupDate: timestamp("next_followup_date", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    metaJson: jsonb("meta_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    prospectIdx: index("activities_prospect_idx").on(t.prospectId),
    dateIdx: index("activities_date_idx").on(t.activityDate),
    userIdx: index("activities_user_idx").on(t.userId),
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    prospectId: integer("prospect_id").references(() => prospects.id, { onDelete: "cascade" }),
    assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    taskTitle: varchar("task_title", { length: 255 }).notNull(),
    taskDescription: text("task_description"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    priority: varchar("priority", { length: 16 }).default("normal"),
    status: varchar("status", { length: 32 }).notNull().default("Pending"),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    prospectIdx: index("tasks_prospect_idx").on(t.prospectId),
    assignedIdx: index("tasks_assigned_idx").on(t.assignedTo),
    statusIdx: index("tasks_status_idx").on(t.status),
    dueIdx: index("tasks_due_idx").on(t.dueDate),
  })
);

// =====================================================
// CUSTOM FIELDS, KPI, SLA, SCORING
// =====================================================

export const customFields = pgTable("custom_fields", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  fieldKey: varchar("field_key", { length: 128 }).notNull(),
  fieldLabel: varchar("field_label", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 32 }).notNull(),
  optionsJson: jsonb("options_json"),
  isRequired: boolean("is_required").notNull().default(false),
  isFilterable: boolean("is_filterable").notNull().default(true),
  isReportable: boolean("is_reportable").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: serial("id").primaryKey(),
    customFieldId: integer("custom_field_id")
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id").notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 18, scale: 6 }),
    valueDate: timestamp("value_date", { withTimezone: true }),
    valueJson: jsonb("value_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entityIdx: index("cfv_entity_idx").on(t.entityType, t.entityId),
    fieldIdx: index("cfv_field_idx").on(t.customFieldId),
  })
);

export const kpiDefinitions = pgTable("kpi_definitions", {
  id: serial("id").primaryKey(),
  kpiKey: varchar("kpi_key", { length: 64 }).notNull().unique(),
  kpiName: varchar("kpi_name", { length: 191 }).notNull(),
  description: text("description"),
  formula: text("formula"),
  entityLevel: varchar("entity_level", { length: 32 }),
  formatType: varchar("format_type", { length: 32 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scoringRules = pgTable("scoring_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 191 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  conditionJson: jsonb("condition_json"),
  scoreValue: integer("score_value").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const slaRules = pgTable("sla_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 191 }).notNull(),
  stageId: integer("stage_id").references(() => leadStages.id, { onDelete: "set null" }),
  maxResponseMinutes: integer("max_response_minutes"),
  maxFollowupHours: integer("max_followup_hours"),
  priority: varchar("priority", { length: 16 }).default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// AUDIT LOGS / IMPORTS
// =====================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: integer("entity_id"),
    action: varchar("action", { length: 64 }).notNull(),
    oldValueJson: jsonb("old_value_json"),
    newValueJson: jsonb("new_value_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entityIdx: index("audit_entity_idx").on(t.entityType, t.entityId),
    userIdx: index("audit_user_idx").on(t.userId),
    createdIdx: index("audit_created_idx").on(t.createdAt),
  })
);

export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  importType: varchar("import_type", { length: 64 }).notNull(),
  fileName: varchar("file_name", { length: 255 }),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  mappingJson: jsonb("mapping_json"),
  summaryJson: jsonb("summary_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sessions table for connect-pg-simple
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6, withTimezone: false }).notNull(),
});
