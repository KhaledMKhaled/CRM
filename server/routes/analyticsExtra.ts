import { Router } from "express";
import { db } from "../db";
import { prospects, deals, lostReasons } from "../../shared/schema";
import { sql, and, gte, lte, eq, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { parseDateRange } from "../lib/aggregations";
import { PERMISSIONS } from "../../shared/permissions";
import { requirePermission } from "../middleware/auth";

const router = Router();

const requireReports = requirePermission(
  PERMISSIONS.REPORTS_ADMIN_VIEW,
  PERMISSIONS.REPORTS_SALES_VIEW,
  PERMISSIONS.REPORTS_MEDIA_VIEW
);

// GET /api/analytics/lost-reasons — bar chart data
router.get("/lost-reasons", requireAuth, requireReports, async (req, res) => {
  const range = parseDateRange(req.query.from as string, req.query.to as string);

  const rows = await db
    .select({
      reasonId: lostReasons.id,
      reasonName: lostReasons.reasonName,
      count: sql<string>`COUNT(${prospects.id})`,
    })
    .from(lostReasons)
    .leftJoin(
      prospects,
      and(
        eq(prospects.lostReasonId, lostReasons.id),
        gte(prospects.lostAt, new Date(range.from)),
        lte(prospects.lostAt, new Date(range.to + "T23:59:59"))
      )
    )
    .groupBy(lostReasons.id, lostReasons.reasonName)
    .orderBy(sql`COUNT(${prospects.id}) DESC`);

  // Also get deal-level lost reasons
  const dealRows = await db
    .select({
      reasonId: lostReasons.id,
      count: sql<string>`COUNT(${deals.id})`,
    })
    .from(lostReasons)
    .leftJoin(
      deals,
      and(
        eq(deals.lostReasonId, lostReasons.id),
        eq(deals.dealStatus, "lost"),
        gte(deals.lostDate, range.from),
        lte(deals.lostDate, range.to)
      )
    )
    .groupBy(lostReasons.id);

  const dealMap = new Map(dealRows.map((r) => [r.reasonId, parseInt(r.count)]));

  const enriched = rows.map((r) => ({
    reasonId: r.reasonId,
    reasonName: r.reasonName,
    prospects: parseInt(r.count),
    deals: dealMap.get(r.reasonId) ?? 0,
  }));

  res.json({ range, rows: enriched });
});

// GET /api/analytics/timeseries?bucket=day|week|month|quarter
router.get("/timeseries", requireAuth, requireReports, async (req, res) => {
  const range = parseDateRange(req.query.from as string, req.query.to as string);
  const bucket = (req.query.bucket as string) ?? "month";

  // Map bucket → SQL time-group expression on meta_daily_performance
  const groupSql =
    bucket === "week"
      ? sql`meta_daily_performance.week`
      : bucket === "quarter"
      ? sql`meta_daily_performance.quarter`
      : bucket === "day"
      ? sql`meta_daily_performance.date`
      : sql`meta_daily_performance.month`;

  const { metaDailyPerformance } = await import("../../shared/schema");

  const spendRows = await db.execute(sql`
    SELECT
      ${groupSql} AS period,
      COALESCE(SUM(amount_spent::numeric), 0) AS spend,
      COALESCE(SUM(impressions), 0) AS impressions,
      COALESCE(SUM(clicks), 0) AS clicks,
      COALESCE(SUM(messaging_conversations_started), 0) AS conversations,
      COALESCE(SUM(messaging_conversations_replied), 0) AS replies,
      COALESCE(SUM(meta_leads), 0) AS meta_leads,
      COALESCE(SUM(website_registrations_completed), 0) AS website_regs
    FROM meta_daily_performance
    WHERE date >= ${range.from} AND date <= ${range.to}
    GROUP BY period
    ORDER BY period
  `);

  // CRM grouping — we calculate period from createdDate
  const prospectSql =
    bucket === "week"
      ? sql`TO_CHAR(DATE_TRUNC('week', created_date), 'IYYY"-W"IW')`
      : bucket === "quarter"
      ? sql`TO_CHAR(created_date, 'YYYY"-Q"Q')`
      : bucket === "day"
      ? sql`DATE(created_date)::text`
      : sql`TO_CHAR(created_date, 'YYYY-MM')`;

  const leadRows = await db.execute(sql`
    SELECT
      ${prospectSql} AS period,
      COUNT(*) AS crm_leads,
      COUNT(mql_at) AS mql,
      COUNT(sql_at) AS sql_count,
      COUNT(won_at) AS won
    FROM prospects
    WHERE created_date >= ${range.from} AND created_date <= ${range.to + "T23:59:59"}
    GROUP BY period
    ORDER BY period
  `);

  const dealSql =
    bucket === "week"
      ? sql`TO_CHAR(DATE_TRUNC('week', won_date::date), 'IYYY"-W"IW')`
      : bucket === "quarter"
      ? sql`TO_CHAR(won_date::date, 'YYYY"-Q"Q')`
      : bucket === "day"
      ? sql`won_date::text`
      : sql`TO_CHAR(won_date::date, 'YYYY-MM')`;

  const revenueRows = await db.execute(sql`
    SELECT
      ${dealSql} AS period,
      COALESCE(SUM(actual_revenue::numeric), 0) AS revenue,
      COUNT(*) AS deals_won
    FROM deals
    WHERE deal_status = 'won'
      AND won_date >= ${range.from} AND won_date <= ${range.to}
    GROUP BY period
    ORDER BY period
  `);

  const leadMap = new Map((leadRows.rows as any[]).map((r) => [r.period, r]));
  const revMap = new Map((revenueRows.rows as any[]).map((r) => [r.period, r]));

  const rows = (spendRows.rows as any[]).map((r) => {
    const period = String(r.period ?? "");
    const l = leadMap.get(period) ?? {};
    const d = revMap.get(period) ?? {};
    const spend = parseFloat(r.spend ?? "0");
    const crmLeads = parseInt(l.crm_leads ?? "0");
    const dealsWon = parseInt(d.deals_won ?? "0");
    const revenue = parseFloat(d.revenue ?? "0");
    return {
      period,
      spend,
      impressions: parseInt(r.impressions ?? "0"),
      clicks: parseInt(r.clicks ?? "0"),
      conversations: parseInt(r.conversations ?? "0"),
      replies: parseInt(r.replies ?? "0"),
      metaLeads: parseInt(r.meta_leads ?? "0"),
      websiteRegs: parseInt(r.website_regs ?? "0"),
      crmLeads,
      mql: parseInt(l.mql ?? "0"),
      sql: parseInt(l.sql_count ?? "0"),
      dealsWon,
      revenue,
      cpl: crmLeads > 0 ? spend / crmLeads : 0,
      cac: dealsWon > 0 ? spend / dealsWon : 0,
      roas: spend > 0 ? revenue / spend : 0,
    };
  });

  res.json({ range, bucket, rows });
});

export default router;
