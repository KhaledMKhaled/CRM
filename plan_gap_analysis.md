# Mofawtar CRM — Plan vs. Current State Gap Analysis

> Review date: 2026-04-27 (updated) | Repo: `d:\MyCRM\CRM`

---

## ✅ Implemented & Matching the Plan

### Step 1 — Project skeleton & tooling
| Item | Status |
|------|--------|
| Vite frontend on port 5000, `host: '0.0.0.0'`, `allowedHosts: true` | ✅ |
| `/api` → `http://localhost:3001` Vite proxy | ✅ |
| Express server on port 3001 (dev) / 5000 (prod, serves static) | ✅ |
| `npm run dev` via `concurrently` (`dev:server` = tsx watch, `dev:client` = vite) | ✅ |
| `drizzle.config.ts` + `db:push` + `db:seed` scripts | ✅ |
| `@/` alias → `src/`, `@shared/` → `shared/` in vite + tsconfig | ✅ |
| `SESSION_SECRET` auto-generated in dev, required in prod | ✅ |

### Step 2 — UI / Data stack
| Package | Status |
|---------|--------|
| Tailwind CSS v4 (`@tailwindcss/vite`) | ✅ |
| shadcn-style Radix-UI components (badge, button, card, dialog, input, label, select, separator, table, tabs, textarea) | ✅ (partial — see gaps) |
| Recharts | ✅ |
| TanStack Query v5 | ✅ |
| TanStack Table v8 | ✅ |
| React Hook Form + Zod | ✅ |
| React Router v7 | ✅ |
| date-fns | ✅ |
| xlsx + papaparse | ✅ |
| Server: express, express-session, connect-pg-simple, bcryptjs, zod, multer, drizzle-orm + kit, pg, tsx | ✅ |
| `<AppRouter>`, `<AuthProvider>`, `<QueryClientProvider>`, sidebar layout, route guards | ✅ |

### Step 3 — Drizzle schema
| Table | Status |
|-------|--------|
| `roles`, `users` | ✅ |
| `campaigns`, `ad_sets`, `ads` | ✅ |
| `meta_daily_performance` (with quarter/month/week derived columns, all conversation metrics) | ✅ |
| `lead_stages`, `lead_statuses`, `lost_reasons`, `products`, `channels`, `activity_types` | ✅ |
| `prospects` (with snapshot cols, attribution flags, all timestamp fields) | ✅ |
| `deals`, `activities`, `tasks` | ✅ |
| `custom_fields`, `custom_field_values` | ✅ |
| `kpi_definitions`, `scoring_rules`, `sla_rules` | ✅ |
| `audit_logs`, `imports`, `session` | ✅ |
| Indexes on date, campaign/adset/ad/prospect/assigned_sales/stage | ✅ |

### Step 4 — Seed script
| Item | Status |
|------|--------|
| 3 default users (admin/sales/media @mofawtar.com) with bcrypt passwords | ✅ |
| 5 campaigns (Brand Awareness, Lead Gen, Messages, Conversions, Retargeting) | ✅ |
| 2–4 ad sets per campaign + 2–3 ads per ad set | ✅ |
| Daily Meta performance Apr 1–Jun 30, 2026 (per-ad rows, sparse ~60%) | ✅ |
| ~25–38 prospects/day, realistic funnel progression | ✅ |
| Activities, deals, tasks per prospect | ✅ |
| Lookup tables: stages, statuses, lost reasons, products, channels, activity types | ✅ |
| KPI definitions, scoring rules, SLA rules, custom fields seeded | ✅ |
| Data-quality intentional issues: unattributed, duplicate phones possible via random gen | ✅ (partial) |
| Idempotent via `TRUNCATE … RESTART IDENTITY CASCADE` | ✅ |

### Step 5 — Auth + RBAC + Permissions
| Item | Status |
|------|--------|
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | ✅ |
| bcrypt + express-session + connect-pg-simple | ✅ |
| Centralized `shared/permissions.ts` with all permission keys | ✅ |
| `requirePermission(key)` middleware | ✅ |
| `permissionsJson` on roles table | ✅ |
| `<AuthProvider>` + `useAuth()` hook | ✅ |
| `<RequirePermission>` route guard | ✅ |
| `useHasPermission()` helper (via RequirePermission) | ✅ |

### Step 6 — Calculation engine
| Item | Status |
|------|--------|
| `shared/calculations.ts` — all formulas (Basic Meta, CRM Funnel, Cost, Revenue metrics) | ✅ |
| Time grouping: `isoWeek`, `yearMonth`, `yearQuarter`, `dayKey` | ✅ |
| Safe division (`safeDiv` — zero denominator → 0/null) | ✅ |
| Formatters: `formatCurrency` (EGP default), `formatNumber`, `formatPercent`, `formatRoas` | ✅ |

### Step 7 — Attribution engine
| Item | Status |
|------|--------|
| `server/lib/attribution.ts` — priority chain (platform_ad_id → UTM → name match) | ✅ |
| `isAttributed` flag on prospects | ✅ |
| `POST /api/analytics/reattribute` — bulk re-run | ✅ |
| `POST /api/analytics/attribute/:id` — manual admin mapping | ✅ |
| `GET /api/analytics/unattributed` — admin queue | ✅ |
| `AttributionPage.tsx` — admin-only manual mapping UI | ✅ |

### Step 8 — REST API routes
| Route group | Status |
|-------------|--------|
| `/api/auth/*` | ✅ |
| `/api/prospects/*` (CRUD, stage transitions, activity timeline) | ✅ |
| `/api/deals/*` | ✅ |
| `/api/activities/*` | ✅ |
| `/api/tasks/*` | ✅ |
| `/api/campaigns/*` (campaigns + adsets + ads) | ✅ |
| `/api/meta/*` (daily perf + import endpoint) | ✅ |
| `/api/analytics/*` (overview, trend, campaigns, channels, leaderboard, stages, data-quality, unattributed, reattribute) | ✅ |
| `/api/settings/*` (all CRUD for lookup tables, users, roles, custom-fields, KPIs, SLA, scoring, config, audit) | ✅ |
| Zod validation on all request bodies | ✅ |
| Audit log writes on mutations | ✅ |
| Permission middleware on all routes | ✅ |

### Step 9 — Frontend layout, navigation & routing
| Item | Status |
|------|--------|
| `<SidebarLayout>` with role-based nav | ✅ |
| `Topbar.tsx` | ✅ |
| `/login` route | ✅ |
| `/` → role-based dashboard redirect | ✅ |
| `/leads`, `/prospects`, `/leads/:id`, `/prospects/:id` | ✅ |
| `/pipeline` | ✅ |
| `/activities` | ✅ |
| `/tasks` | ✅ |
| `/deals`, `/deals/:id` | ✅ |
| `/meta-ads` | ✅ |
| `/campaigns`, `/campaigns/:id` | ✅ |
| `/adsets/:id`, `/ads/:id` | ✅ |
| `/imports` (ImportWizardPage) | ✅ |
| `/reports` | ✅ |
| `/settings` | ✅ |
| `/users` | ✅ |
| `/data-quality` | ✅ |
| `/audit` | ✅ |
| `/integrations` | ✅ |
| `/attribution` | ✅ |

### Step 10 — Dashboards & Reports
| Item | Status |
|------|--------|
| `AdminDashboard.tsx` — KPI cards, spend/revenue chart, funnel, top-campaigns table, leaderboard | ✅ |
| `SalesDashboard.tsx` | ✅ |
| `MediaDashboard.tsx` | ✅ |
| `ReportsPage.tsx` — tabs: Campaign ROAS, Channels, Trend, Funnel, Stage distribution, Sales reps | ✅ |

### Step 11 — CRM surfaces
| Item | Status |
|------|--------|
| `LeadsPage.tsx` — list, search, filter, sort, stage badges | ✅ |
| `LeadDetailPage.tsx` — info + activity timeline + add-activity form | ✅ |
| `PipelinePage.tsx` — kanban-style stage navigation | ✅ |
| `ActivitiesPage.tsx` | ✅ |
| `TasksPage.tsx` | ✅ |
| `DealsPage.tsx` + `DealDetailPage.tsx` | ✅ |

### Step 12 — Meta Ads surfaces
| Item | Status |
|------|--------|
| `MetaAdsPage.tsx` — table with search/filter/sort | ✅ |
| `CampaignsPage.tsx` + `CampaignDetailPage.tsx` | ✅ |
| `AdsetDetailPage.tsx`, `AdDetailPage.tsx` | ✅ |
| `ImportWizardPage.tsx` — upload → preview → column mapping → validate → confirm | ✅ |

### Step 13 — Settings & Admin surfaces
| Item | Status |
|------|--------|
| `SettingsPage.tsx` — lookup CRUD tabs | ✅ |
| `UsersPage.tsx` | ✅ |
| `DataQualityPage.tsx` | ✅ |
| `AuditLogPage.tsx` | ✅ |
| `IntegrationsPage.tsx` — placeholder cards (Meta, WhatsApp, Messenger, Instagram, Website, Payment, Google Sheets) | ✅ |
| `AttributionPage.tsx` — unattributed queue + manual mapping | ✅ |

---

## ❌ Remaining Gaps (Post-Session 2 Review)

### Step 4 — Seed gaps (Low priority)
| Gap | Plan requirement |
|-----|----------------|
| **Intentional "unattributed" prospects not guaranteed** | Plan §4: deliberate set with `isAttributed: false` |
| **No duplicate phones/emails explicitly seeded** | Plan §4 data-quality issues |
| **No deals without revenue** | Some won deals should have `actualRevenue = 0` |

### Step 8 — API gaps (Low/Medium)
| Gap | Plan requirement |
|-----|----------------|
| **No export endpoint** | `GET /api/reports/export` (CSV server-side) — currently client-side only |
| **Audit log `oldValueJson`** not populated in most mutations | Plan: old/new value diffs in audit viewer |

### Step 14 — Polish gaps (Low)
| Gap | Plan requirement |
|-----|----------------|
| **No empty/loading/error states** consistently | Some pages lack proper skeleton/error UI |
| **`npm run start`** runs tsx without building first | Should build then serve |
| **`replit.md`** may be stale | Final stack + seeded users + import guide |

---

## Summary Score by Plan Step

| Step | Coverage | Notes |
|------|----------|-------|
| 1 — Skeleton & tooling | 🟢 100% | |
| 2 — UI/data stack | 🟢 95% | DataTable ✅, useHasPermission ✅, toast ✅ |
| 3 — Drizzle schema | 🟢 95% | |
| 4 — Seed script | 🟡 75% | Missing explicit bad-data rows |
| 5 — Auth + RBAC | 🟢 95% | |
| 6 — Calculation engine | 🟢 95% | |
| 7 — Attribution engine | 🟢 95% | |
| 8 — REST API | 🟢 90% | Timeseries ✅, lost-reasons ✅, custom-fields ✅ |
| 9 — Frontend routing | 🟢 95% | /adsets ✅, /ads ✅, reports still one page |
| 10 — Dashboards & reports | 🟢 85% | ROAS bar ✅, donut ✅, lost-reasons chart ✅, worst-CAC ✅, timeseries ✅ |
| 11 — CRM surfaces | 🟢 90% | Custom fields in LeadDetail ✅, drag-and-drop ✅ |
| 12 — Meta Ads surfaces | 🟢 90% | Full MetaAdsPage ✅, AdsetDetailPage ✅, AdDetailPage ✅ |
| 13 — Settings & Admin | 🟢 85% | Roles & Perms toggle ✅, Custom Fields panel ✅, KPI ✅, SLA ✅ |
| 14 — Polish & deploy | 🟡 65% | Build passes ✅; empty states & start script pending |

**Overall: ~91% complete**

---

## Priority Fix Queue — Updated Status

### ✅ Completed (Sessions 1 & 2)
1. ✅ **Settings sub-pages**: Roles & Permissions toggle UI, Custom Fields manager, KPI/SLA editors — all in SettingsPage tabs
2. ✅ **Time-period reports**: Daily/Weekly/Monthly/Quarterly toggle in ReportsPage with full metric table + bar chart, via `/api/analytics/timeseries`
3. ✅ **`/adsets` and `/ads` dedicated list pages** — `AdsetsPage.tsx` and `AdsListPage.tsx` with proper routes
4. ✅ **MetaAdsPage**: full DataTable + manual-add form with cascading Campaign→AdSet→Ad dropdowns
5. ✅ **Custom fields in CRM forms** — `GET/PUT /api/prospects/:id/custom-fields` + `CustomFieldsPanel` in LeadDetailPage
6. ✅ **AdsetDetailPage / AdDetailPage**: KPI stat cards + daily performance bar chart + ads table
7. ✅ **Toast/notification** component wired up
8. ✅ **ROAS-by-campaign bar chart + channel donut** on Admin Dashboard
9. ✅ **Lost-reasons analytics endpoint** + bar chart on Admin Dashboard & ReportsPage
10. ✅ **Kanban drag-and-drop** in PipelinePage (HTML5 drag API with optimistic updates)
11. ✅ **`useHasPermission()` hook** for conditional field hiding
12. ✅ **`DataTable` reusable component** (search, sort, export, pagination)
13. ✅ **Fixed duplicate `ALL_PERMISSIONS` export** in `shared/permissions.ts` (build error)

### 🟡 Remaining (Medium priority)
- Audit log `oldValueJson` population in mutations
- Consistent empty/loading/error states across all pages

### 🟢 Low priority
- Seed: explicit unattributed prospects, duplicate phones, deals-without-revenue
- `npm run start` → build step first
- `replit.md` final update
- Import mapping saved presets page
- Server-side CSV export endpoint
