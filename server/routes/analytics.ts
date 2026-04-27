import { Router } from "express";
import { db } from "../db";
import { prospects, deals, activities, leadStages } from "../../shared/schema";
import { sql, and, gte, lte, eq, isNull } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import {
  getOverallMetrics,
  getDailyTrend,
  getCampaignPerformance,
  getFunnelCounts,
  getSalesLeaderboard,
  getStageDistribution,
  parseDateRange,
} from "../lib/aggregations";

const router = Router();

// Permission gate: any of the three reports views grants analytics access.
const requireReports = requirePermission(
  PERMISSIONS.REPORTS_ADMIN_VIEW,
  PERMISSIONS.REPORTS_SALES_VIEW,
  PERMISSIONS.REPORTS_MEDIA_VIEW
);

router.get("/overview", requireAuth, requireReports, async (req: AuthedRequest, res) => {
  const range = parseDateRange(req.query.from as string, req.query.to as string);
  const [overall, funnel] = await Promise.all([getOverallMetrics(range), getFunnelCounts(range)]);
  res.json({ range, overall, funnel });
});

router.get("/trend", requireAuth, requireReports, async (req: AuthedRequest, res) => {
  const range = parseDateRange(req.query.from as string, req.query.to as string);
  const points = await getDailyTrend(range);

  // augment trend with daily won-deals count + revenue, keyed by wonDate
  const wonRows = await db
    .select({
      date: sql<string>`TO_CHAR(${deals.wonDate}, 'YYYY-MM-DD')`,
      won: sql<string>`COUNT(*)`,
      revenue: sql<string>`COALESCE(SUM(${deals.actualRevenue}::numeric), 0)`,
    })
    .from(deals)
    .where(
      and(
        eq(deals.dealStatus, "won"),
        gte(deals.wonDate, range.from),
        lte(deals.wonDate, range.to)
      )
    )
    .groupBy(sql`TO_CHAR(${deals.wonDate}, 'YYYY-MM-DD')`);
  const wonByDate = new Map(wonRows.map((r) => [r.date, { won: parseInt(r.won), revenue: parseFloat(r.revenue) }]));
  const enriched = points.map((p) => {
    const dKey = String(p.date);
    const w = wonByDate.get(dKey);
    return { ...p, won: w?.won ?? 0, revenue: w?.revenue ?? 0 };
  });
  res.json({ range, points: enriched });
});

router.get("/campaigns", requireAuth, requireReports, async (req: AuthedRequest, res) => {
  const range = parseDateRange(req.query.from as string, req.query.to as string);
  res.json({ range, rows: await getCampaignPerformance(range) });
});

router.get("/channels", requireAuth, requireReports, async (req: AuthedRequest, res) => {
  const range = parseDateRange(req.query.from as string, req.query.to as string);
  // Aggregate prospects + deals by channel string on the prospect record.
  const rows = await db
    .select({
      channel: prospects.channel,
      leads: sql<string>`COUNT(*)`,
      mql: sql<string>`COUNT(${prospects.mqlAt})`,
      sqlV: sql<string>`COUNT(${prospects.sqlAt})`,
      won: sql<string>`COUNT(${prospects.wonAt})`,
    })
    .from(prospects)
    .where(
      and(
        gte(prospects.createdDate, new Date(range.from)),
        lte(prospects.createdDate, new Date(range.to + "T23:59:59"))
      )
    )
    .groupBy(prospects.channel);

  const revRows = await db
    .select({
      channel: prospects.channel,
      revenue: sql<string>`COALESCE(SUM(${deals.actualRevenue}::numeric) FILTER (WHERE ${deals.dealStatus} = 'won'), 0)`,
    })
    .from(deals)
    .leftJoin(prospects, eq(deals.prospectId, prospects.id))
    .where(
      and(
        eq(deals.dealStatus, "won"),
        gte(deals.wonDate, range.from),
        lte(deals.wonDate, range.to)
      )
    )
    .groupBy(prospects.channel);
  const revMap = new Map(revRows.map((r) => [r.channel, parseFloat(r.revenue)]));

  const enriched = rows.map((r) => {
    const leads = parseInt(r.leads);
    const won = parseInt(r.won);
    return {
      channel: r.channel ?? "Unknown",
      leads,
      mql: parseInt(r.mql),
      sql: parseInt(r.sqlV),
      won,
      revenue: revMap.get(r.channel) ?? 0,
      winRate: leads > 0 ? won / leads : 0,
    };
  });
  res.json({ range, rows: enriched });
});

router.get("/leaderboard", requireAuth, requireReports, async (req: AuthedRequest, res) => {
  const range = parseDateRange(req.query.from as string, req.query.to as string);
  const board = await getSalesLeaderboard(range);

  // Add per-user activity counts for the period.
  const actRows = await db
    .select({
      userId: activities.userId,
      activities: sql<string>`COUNT(*)`,
    })
    .from(activities)
    .where(
      and(
        gte(activities.activityDate, new Date(range.from)),
        lte(activities.activityDate, new Date(range.to + "T23:59:59"))
      )
    )
    .groupBy(activities.userId);
  const actMap = new Map(actRows.map((r) => [r.userId, parseInt(r.activities)]));
  const enriched = board.map((b) => ({ ...b, activities: actMap.get(b.userId) ?? 0 }));
  res.json({ range, rows: enriched });
});

router.get("/stages", requireAuth, requireReports, async (_req, res) => {
  res.json({ rows: await getStageDistribution() });
});

router.get("/data-quality", requireAuth, requireReports, async (_req, res) => {
  const totalAgg = await db.select({ n: sql<string>`COUNT(*)` }).from(prospects);
  const total = parseInt(totalAgg[0]?.n ?? "0");

  const unattribAgg = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(prospects)
    .where(eq(prospects.isAttributed, false));
  const unattributed = parseInt(unattribAgg[0]?.n ?? "0");

  const noPhoneAgg = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(prospects)
    .where(sql`${prospects.phone} IS NULL OR ${prospects.phone} = ''`);
  const missingPhone = parseInt(noPhoneAgg[0]?.n ?? "0");

  const noEmailAgg = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(prospects)
    .where(sql`${prospects.email} IS NULL OR ${prospects.email} = ''`);
  const missingEmail = parseInt(noEmailAgg[0]?.n ?? "0");

  // Stale: open prospects (not won/lost) with no activity in 14+ days.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const staleRows = await db
    .select({
      id: prospects.id,
      fullName: prospects.fullName,
      leadQuality: prospects.leadQuality,
      stageName: leadStages.stageName,
      lastActivityAt: prospects.lastActivityAt,
      createdDate: prospects.createdDate,
    })
    .from(prospects)
    .leftJoin(leadStages, eq(prospects.leadStageId, leadStages.id))
    .where(
      and(
        isNull(prospects.wonAt),
        isNull(prospects.lostAt),
        sql`COALESCE(${prospects.lastActivityAt}, ${prospects.createdDate}) < ${cutoff.toISOString()}`
      )
    )
    .orderBy(prospects.lastActivityAt)
    .limit(50);

  const stale = staleRows.map((s) => {
    const ref = s.lastActivityAt ?? s.createdDate;
    const days = ref ? Math.floor((Date.now() - new Date(ref).getTime()) / (24 * 60 * 60 * 1000)) : 0;
    return { ...s, daysSinceActivity: days };
  });

  res.json({ total, unattributed, missingPhone, missingEmail, stale });
});

export default router;
