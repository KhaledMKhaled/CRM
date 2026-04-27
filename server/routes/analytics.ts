import { Router } from "express";
import { db } from "../db";
import { prospects, deals, activities, leadStages, campaigns, adSets, ads } from "../../shared/schema";
import { sql, and, gte, lte, eq, isNull, desc } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { reattributeAllProspects } from "../lib/attribution";
import { audit } from "../lib/audit";
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

  // Prospects with no owner assigned
  const noOwnerAgg = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(prospects)
    .where(isNull(prospects.assignedSalesId));
  const missingOwner = parseInt(noOwnerAgg[0]?.n ?? "0");

  // Prospects with no stage
  const noStageAgg = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(prospects)
    .where(isNull(prospects.leadStageId));
  const missingStage = parseInt(noStageAgg[0]?.n ?? "0");

  // Duplicate phones (>1 prospect sharing the same normalized phone)
  const dupPhoneAgg = await db.execute(sql`
    SELECT COUNT(*) AS n FROM (
      SELECT phone FROM prospects
      WHERE phone IS NOT NULL AND phone <> ''
      GROUP BY phone HAVING COUNT(*) > 1
    ) t
  `);
  const duplicatePhones = parseInt((dupPhoneAgg.rows?.[0] as any)?.n ?? "0");

  // Duplicate emails
  const dupEmailAgg = await db.execute(sql`
    SELECT COUNT(*) AS n FROM (
      SELECT LOWER(email) AS e FROM prospects
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY LOWER(email) HAVING COUNT(*) > 1
    ) t
  `);
  const duplicateEmails = parseInt((dupEmailAgg.rows?.[0] as any)?.n ?? "0");

  // Deals without a product
  const dealsNoProductAgg = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(deals)
    .where(isNull(deals.productId));
  const dealsMissingProduct = parseInt(dealsNoProductAgg[0]?.n ?? "0");

  // Open deals past their expected close date
  const overdueDealsAgg = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(deals)
    .where(
      and(
        eq(deals.dealStatus, "open"),
        sql`${deals.closeDate} IS NOT NULL AND ${deals.closeDate} < CURRENT_DATE`
      )
    );
  const overdueDeals = parseInt(overdueDealsAgg[0]?.n ?? "0");

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

  res.json({
    total,
    unattributed,
    missingPhone,
    missingEmail,
    missingOwner,
    missingStage,
    duplicatePhones,
    duplicateEmails,
    dealsMissingProduct,
    overdueDeals,
    stale,
  });
});

// Unattributed prospects (admin queue)
router.get(
  "/unattributed",
  requireAuth,
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  async (req: AuthedRequest, res) => {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "100"), 500);
    const rows = await db
      .select({
        id: prospects.id,
        fullName: prospects.fullName,
        channel: prospects.channel,
        utmCampaign: prospects.utmCampaign,
        utmContent: prospects.utmContent,
        utmTerm: prospects.utmTerm,
        campaignNameSnapshot: prospects.campaignNameSnapshot,
        adsetNameSnapshot: prospects.adsetNameSnapshot,
        adNameSnapshot: prospects.adNameSnapshot,
        createdAt: prospects.createdAt,
      })
      .from(prospects)
      .where(eq(prospects.isAttributed, false))
      .orderBy(desc(prospects.createdAt))
      .limit(limit);
    res.json(rows);
  }
);

// Re-run attribution priority chain on all unattributed prospects
router.post(
  "/reattribute",
  requireAuth,
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  async (req: AuthedRequest, res) => {
    try {
      const updated = await reattributeAllProspects();
      await audit({
        userId: req.user!.id,
        entityType: "attribution",
        entityId: 0,
        action: "reattribute_all",
        newValue: { updated },
      });
      res.json({ updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

// Manually attribute a single prospect
router.post(
  "/attribute/:id",
  requireAuth,
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  async (req: AuthedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { campaignId, adsetId, adId } = req.body as {
        campaignId?: number | null;
        adsetId?: number | null;
        adId?: number | null;
      };
      if (!campaignId) return res.status(400).json({ error: "campaignId required" });

      const [c] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
      if (!c) return res.status(404).json({ error: "campaign not found" });

      let asRow = null as any;
      if (adsetId) {
        const r = await db.select().from(adSets).where(eq(adSets.id, adsetId)).limit(1);
        asRow = r[0];
        if (!asRow) return res.status(404).json({ error: "ad set not found" });
        if (asRow.campaignId !== campaignId) {
          return res.status(400).json({ error: "ad set does not belong to campaign" });
        }
      }

      let adRow = null as any;
      let resolvedAdsetId: number | null = adsetId ?? null;
      if (adId) {
        const r = await db.select().from(ads).where(eq(ads.id, adId)).limit(1);
        adRow = r[0];
        if (!adRow) return res.status(404).json({ error: "ad not found" });
        // Always validate the full ad → adset → campaign chain.
        if (adRow.campaignId !== campaignId) {
          return res.status(400).json({ error: "ad does not belong to campaign" });
        }
        if (adsetId) {
          if (adRow.adsetId !== adsetId) {
            return res.status(400).json({ error: "ad does not belong to ad set" });
          }
        } else if (adRow.adsetId) {
          // Caller omitted adsetId — derive it from the ad and re-validate against campaign.
          const r2 = await db.select().from(adSets).where(eq(adSets.id, adRow.adsetId)).limit(1);
          asRow = r2[0];
          if (!asRow || asRow.campaignId !== campaignId) {
            return res.status(400).json({ error: "derived ad set does not belong to campaign" });
          }
          resolvedAdsetId = adRow.adsetId;
        }
      }

      const updated = await db
        .update(prospects)
        .set({
          campaignId,
          adsetId: resolvedAdsetId,
          adId: adId ?? null,
          campaignNameSnapshot: c.campaignName,
          adsetNameSnapshot: asRow?.adsetName ?? null,
          adNameSnapshot: adRow?.adName ?? null,
          isAttributed: true,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, id))
        .returning();
      if (!updated[0]) return res.status(404).json({ error: "prospect not found" });

      await audit({
        userId: req.user!.id,
        entityType: "prospect",
        entityId: id,
        action: "manual_attribute",
        newValue: { campaignId, adsetId, adId },
      });
      res.json(updated[0]);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
);

export default router;
