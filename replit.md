# Mofawtar — CRM + Marketing Attribution + ROAS Analytics

## Overview
Production-ready full-stack web app that replaces an Excel-based CRM/ROAS workbook with a real database, role-based UI, and live attribution between Meta Ads spend → conversations → CRM leads → deals → revenue.

Currency: **EGP**. Single workflow `Start application` running `npm run dev` (concurrently spawns server + client).

## Stack
- **Frontend** (port 5000): React 19 + Vite 8 + TypeScript + Tailwind v4 + shadcn-style UI primitives + Recharts + TanStack Query + React Router 7
- **Backend** (dev port 3001, prod port 5000 serving `dist/`): Express 5 + Drizzle ORM + PostgreSQL + connect-pg-simple sessions + bcryptjs + xlsx + zod
- Vite dev proxies `/api` → `http://localhost:3001`. In production, the server serves the built SPA from `dist/` and exposes `/api`.

## Roles & default users
| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@mofawtar.com | Admin123456 |
| Sales | sales@mofawtar.com | Sales123456 |
| Media Buyer | media@mofawtar.com | Media123456 |

Plus seeded sales reps (`s1@…`, `s2@…`, `s3@…`) and media buyers (`m1@…`, `m2@…`) all with the same role-prefix passwords.

Permissions are stored as **string keys** on the `roles.permissions` JSONB column and enforced both server-side (middleware/auth.ts) and client-side (`<RequirePermission>` and the Sidebar nav filter).

## Project layout
```
shared/
  schema.ts            Drizzle tables + zod insert schemas
  permissions.ts       PERMISSIONS dict + ROLES list
  calculations.ts      ROAS / CAC / CPL / formatters (EGP)
server/
  index.ts             Express + session + static serving for prod
  db.ts                pg Pool + drizzle
  middleware/auth.ts   requireAuth / requirePermission
  lib/
    attribution.ts     Priority chain: utm_campaign → ad/adset/campaign snapshot
    audit.ts           Diff-based audit trail
    aggregations.ts    Reusable analytics aggregations
  routes/
    auth.ts prospects.ts deals.ts activities.ts tasks.ts
    campaigns.ts meta.ts (XLSX/CSV import wizard) analytics.ts settings.ts
  seed.ts              Q2 2026 seed (Apr 1 – Jun 30)
src/
  App.tsx              Router with permission-gated routes
  contexts/AuthContext.tsx
  components/
    ui/* (shadcn primitives)
    layout/{Sidebar, Topbar, AppLayout}
    charts/{LineTrendChart, BarChartCompact, Funnel}
    PageHeader, StatCard, RequirePermission, DateRangePicker
  pages/
    LoginPage, DashboardRouter
    dashboards/{Admin, Sales, Media}Dashboard
    crm/{Leads, LeadDetail, Pipeline, Activities, Tasks, Deals}Page
    meta/{MetaAds, Campaigns, ImportWizard}Page
    reports/ReportsPage
    settings/SettingsPage
    admin/{Users, DataQuality, AuditLog, Integrations}Page
```

## Seeded data (Q2 2026)
- 7 users, 8 lead stages, 5 products, 5 campaigns, 16 ad sets, 38 ads
- 2 068 `meta_daily_performance` rows
- 2 575 prospects (with activities, deals, tasks); ~691 deals, 214 won, EGP 2.87M revenue, EGP 418K spend → ROAS ≈ 6.9x

Re-seed any time with `npm run db:seed` (clears all transactional data first).

## Scripts
- `npm run dev` — concurrent server (3001) + Vite (5000)
- `npm run build` — `vite build` (server runs via `tsx` directly)
- `npm run start` — `NODE_ENV=production tsx server/index.ts` (serves the built SPA from `dist/` and the API on a single port — `PORT` env, default 5000)
- `npm run db:push` — sync Drizzle schema
- `npm run db:seed`

## Environment
- `DATABASE_URL` — auto-injected by Replit
- `SESSION_SECRET` — falls back to a dev secret if missing (rotate in production)
- Do **not** import `dotenv/config` — Replit auto-loads env vars.

## Deployment
Configured for **autoscale**: build with `npm run build` then run `npm run start`. The server then listens on port 5000 and serves the built SPA + API.

## Key product behaviors
- **Attribution chain** (server/lib/attribution.ts): `utm_campaign` → `ad_id` → `adset_id` → `campaign_id` → unattributed; snapshots are stored on the prospect at create-time so historical reports remain stable when campaigns are renamed.
- **ROAS / ROI / CPL / CAC / win-rate** computed on the server (`shared/calculations.ts` exports the formulas; `server/lib/aggregations.ts` rolls them up by campaign / channel / day).
- **Import wizard** (`/imports`): two-step parse → preview → commit for `meta_daily`, `campaigns`, `prospects` datasets (XLSX or CSV), with per-row validation and upsert by natural keys.
- **Audit log** records create / update / delete with JSON diff per entity.
