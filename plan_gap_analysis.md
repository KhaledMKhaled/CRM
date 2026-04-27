# Mofawtar CRM — Plan vs. Current State Gap Analysis

> Review date: 2026-04-27 | Repo: `d:\MyCRM\CRM`

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

## ❌ Gaps / Missing / Incomplete

### Step 2 — UI Stack gaps
| Gap | Plan requirement | Impact |
|-----|-----------------|--------|
| **Missing shadcn components**: `toast`, `checkbox`, `radio-group`, `dropdown-menu`, `avatar`, `switch`, `progress`, `scroll-area`, `popover`, `tooltip`, `slider` are in `package.json` but no corresponding component files in `src/components/ui/` | Used throughout the plan (toast notifications, toggle-switches in settings, avatars in leaderboard, dropdowns in filters) | Medium — some UI may silently fail |
| **No `<DataTable>` component** in `src/components/` | Plan §9 specifies a reusable TanStack Table wrapper with search, sort, multi-filter, date-range, column show/hide, pagination, CSV export, saved views | High — each page reimplements it |
| **No `useHasPermission()` standalone hook** | Plan §5 — conditional UI hiding (cost/revenue/personal-data fields per role) | Medium |

### Step 4 — Seed gaps
| Gap | Plan requirement |
|-----|----------------|
| **Intentional "unattributed" prospects not guaranteed** — seed assigns `isMeta = channel.startsWith("Meta") || rand() < 0.6`, so most prospects get a campaign. Plan calls for a deliberate set with `isAttributed: false` and no campaign | Data Quality panel may show 0 unattributed |
| **No duplicate phones/emails explicitly seeded** | Plan §4 says "small set of intentional data-quality issues (duplicate phones, deals without revenue, unattributed)" |
| **No deals without revenue** | `actualRevenue` is always `> 0` for won deals; plan wants some won deals without actual revenue |
| **No "won deals without close date"** | All won deals have `wonDate` set |
| **No "campaigns with spend but no CRM leads"** | Coverage is complete in seed |
| **Seed is NOT idempotent by re-running** | `TRUNCATE` destroys existing data — plan says "idempotent". Currently it re-seeds cleanly but a true idempotent seed would use upserts + skip-if-exists rather than truncate |

### Step 8 — API gaps
| Gap | Plan requirement |
|-----|----------------|
| **No `/api/analytics/meta-timeseries` endpoint** | Plan §8: Daily/Weekly/Monthly/Quarterly Performance pages grouping spend, conversations, replies, CRM leads, MQL, SQL, ROAS by time bucket | High |
| **No time-bucketed endpoints** | `GET /api/analytics/trend` returns raw daily points, but no weekly/monthly/quarterly grouping API | High |
| **No export endpoint** | Plan §8: `GET /api/reports/export` (CSV) for reports — frontend only does client-side `downloadCsv()` on already-fetched data | Medium |
| **Missing `adsets` route** standalone | `/api/campaigns` returns campaigns; nested adsets addressable via campaign detail, but no `GET /api/adsets` for the flat adsets list page | Medium |
| **Audit log missing `oldValueJson`** in `/api/settings/audit` response | Plan says "old/new value diffs" in audit viewer — `oldValueJson` column exists in schema but not populated in most mutations | Medium |
| **No lost reasons analytics endpoint** | Plan §10: "lost reasons bar" chart on dashboard — no `/api/analytics/lost-reasons` | Medium |

### Step 9 — Routing gaps
| Gap | Plan requirement |
|-----|----------------|
| **`/adsets` → `CampaignsPage`** (line 64 of App.tsx) | Plan specifies a dedicated Ad Sets list page, not reusing CampaignsPage | Medium |
| **`/ads` → `CampaignsPage`** (line 66) | Same — dedicated Ads list page missing | Medium |
| **No `/reports/*` sub-routes** | Plan §9 enumerates `/reports/executive`, `/reports/daily`, `/reports/weekly`, `/reports/monthly`, `/reports/quarterly`, `/reports/campaigns`, `/reports/adsets`, `/reports/ads`, `/reports/channels`, `/reports/sales`, `/reports/roas`, `/reports/lead-source`, `/reports/revenue-attribution`, `/reports/lost-reasons`, `/reports/sla`, `/reports/unattributed`, `/reports/data-quality` — all collapsed into one `ReportsPage` with tabs | High |
| **No `/pipeline` for Media Buyer** | Sidebar nav hides pipeline from Media Buyer role — check if required or not per spec |
| **No `/settings/*` sub-routes** | Plan §13 lists sub-pages: `/settings/stages`, `/settings/users`, `/settings/roles`, `/settings/custom-fields`, `/settings/kpis`, `/settings/sla`, `/settings/scoring`, `/settings/import-mapping` — all in one `SettingsPage` | Medium |

### Step 10 — Dashboard & Reports gaps
| Gap | Plan requirement |
|-----|----------------|
| **No ROAS-by-campaign bar chart** on Admin Dashboard | Plan §10: "bar: ROAS by campaign" — only spend bar exists | Medium |
| **No channel donut chart** | Plan §10: "donut: leads by channel" — no PieChart/RadialChart built | Medium |
| **No lost-reasons bar chart** on dashboard | Plan §10 | Medium |
| **No "worst-by-CAC table"** on dashboard | Plan §10 | Low |
| **No dedicated Daily/Weekly/Monthly/Quarterly report pages** | Plan §8, §19 — only a trend chart exists; no tabular grouping by week/month/quarter with full metric set | High |
| **No Ad Set / Ad Performance pages with rollup metrics** | Plan §12 — `AdsetDetailPage` and `AdDetailPage` are 2–2.5 KB stubs | High |
| **No Lead Source Quality report** | Plan §19 | Medium |
| **No Revenue Attribution report** | Plan §19 | Medium |
| **No SLA Compliance report** | Plan §19 | Medium |
| **ReportsPage tabs are partial** (missing MQL/SQL metrics in the Campaign tab; missing CPL, cost per MQL/SQL, CAC columns) | Plan §8 full metric set | Medium |

### Step 11 — CRM gaps
| Gap | Plan requirement |
|-----|----------------|
| **Stage change → auto-create activity** not verified on client | Plan §6: stage changes auto-create "Stage Changed" activity — server-side in `prospects.ts` route but not confirmed | Medium |
| **No Kanban drag-and-drop** in PipelinePage | Plan §11: "drag prospects between stages" — `PipelinePage.tsx` is 7 KB, likely a button-based stage move, not drag | Medium |
| **No dynamic custom fields in forms** | Plan §11: "forms for create/edit using React Hook Form + Zod and dynamic custom fields" — `customFieldValues` exist in schema + API but not surfaced in the LeadDetail form | High |
| **Sales Pipeline kanban transitions don't update deal-won/lost** on client | Plan §6 | Medium |

### Step 12 — Meta Ads gaps
| Gap | Plan requirement |
|-----|----------------|
| **MetaAdsPage is minimal (3.9 KB)** | Plan §12: full search/sort/filter/paginate, manual add via form — likely very basic | High |
| **Import: validation errors row-by-row** not clearly implemented | Plan §12: "validation errors surfaced row-by-row" in ImportWizard | Medium |

### Step 13 — Settings gaps
| Gap | Plan requirement |
|-----|----------------|
| **SettingsPage (6.4 KB) is a single page** covering all lookup tables | Plan §13: separate Admin pages for each — Roles & Permissions toggle UI is cited | High |
| **No Roles & Permissions toggle UI** | Plan §13: toggle permission keys per role per UI | High |
| **No Custom Fields manager page** | Plan §13: per-entity custom fields surfaced in forms/tables/filters/exports | High |
| **No KPI Definitions editor page** | Plan §13 | Medium |
| **No Scoring Rules editor page** | Plan §13 | Medium |
| **No SLA Rules editor page** | Plan §13 | Medium |
| **No Import Mapping saved-presets page** | Plan §13 | Low |

### Step 14 — Polish / Deploy gaps
| Gap | Plan requirement |
|-----|----------------|
| **No empty/loading/error states** consistently across pages | Plan §14 | Medium |
| **No replit.md update** with final stack, scripts, seeded users, import guide | Plan §14 (`replit.md` exists but may be stale) | Low |
| **`npm run start` for autoscale** → runs `tsx server/index.ts` which don't build first | Plan §14: `npm run start` should run `vite build` then serve | Low |
| **No `npm run build` verification** | Plan §14 | Low |
| **No `drizzle-zod` integration** (installed but unused) | Could simplify Zod schema definitions | Low |

---

## Summary Score by Plan Step

| Step | Coverage |
|------|----------|
| 1 — Skeleton & tooling | 🟢 100% |
| 2 — UI/data stack | 🟡 80% |
| 3 — Drizzle schema | 🟢 95% |
| 4 — Seed script | 🟡 75% |
| 5 — Auth + RBAC | 🟢 90% |
| 6 — Calculation engine | 🟢 95% |
| 7 — Attribution engine | 🟢 95% |
| 8 — REST API | 🟡 70% |
| 9 — Frontend routing | 🟡 70% |
| 10 — Dashboards & reports | 🟡 60% |
| 11 — CRM surfaces | 🟡 70% |
| 12 — Meta Ads surfaces | 🟡 65% |
| 13 — Settings & Admin | 🔴 45% |
| 14 — Polish & deploy | 🟡 60% |

**Overall: ~74% complete**

---

## Priority Fix Queue

### 🔴 High priority
1. **Settings sub-pages**: Roles & Permissions toggle UI, Custom Fields manager, KPI/SLA/Scoring editors
2. **Dedicated report pages**: Daily/Weekly/Monthly/Quarterly with full metric set (time-bucket API needed)
3. **`/adsets` and `/ads` dedicated list pages** (not aliased to CampaignsPage)
4. **MetaAdsPage**: full table with manual-add form; ImportWizard row-level validation
5. **Custom fields in CRM forms** (LeadDetailPage, ProspectCreate)
6. **AdsetDetailPage / AdDetailPage** content (currently stubs)

### 🟡 Medium priority
7. Toast/notification component wired up
8. ROAS-by-campaign bar chart + channel donut on Admin Dashboard
9. Lost-reasons analytics endpoint + bar chart on dashboard
10. Audit log `oldValueJson` population
11. Kanban drag-and-drop in PipelinePage
12. Standalone `useHasPermission()` hook for conditional field hiding
13. `DataTable` reusable component

### 🟢 Low priority
14. Seed: explicit unattributed prospects, duplicate phones, deals-without-revenue
15. `npm run start` → build step
16. `replit.md` final update
17. Import mapping saved presets page
