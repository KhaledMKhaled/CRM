// Aggregation helpers for the analytics endpoints.
import { db } from "../db";
import {
  metaDailyPerformance,
  prospects,
  deals,
  campaigns,
  adSets,
  ads,
  users,
  leadStages,
} from "../../shared/schema";
import { sql, and, gte, lte, eq, inArray } from "drizzle-orm";
import { deriveMetrics, emptyMetrics, type MetricsRow } from "../../shared/calculations";

export interface DateRange {
  from: string;
  to: string;
}

export function thisQuarterRange(): DateRange {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export function parseDateRange(from?: string, to?: string): DateRange {
  if (from && to) return { from, to };
  return thisQuarterRange();
}

export async function getOverallMetrics(range: DateRange): Promise<MetricsRow & ReturnType<typeof deriveMetrics>> {
  // Spend / impressions / etc from meta_daily_performance
  const spendAgg = await db
    .select({
      spend: sql<string>`COALESCE(SUM(${metaDailyPerformance.amountSpent}::numeric), 0)`,
      impressions: sql<string>`COALESCE(SUM(${metaDailyPerformance.impressions}), 0)`,
      reach: sql<string>`COALESCE(SUM(${metaDailyPerformance.reach}), 0)`,
      clicks: sql<string>`COALESCE(SUM(${metaDailyPerformance.clicks}), 0)`,
      conversations: sql<string>`COALESCE(SUM(${metaDailyPerformance.messagingConversationsStarted}), 0)`,
      replies: sql<string>`COALESCE(SUM(${metaDailyPerformance.messagingConversationsReplied}), 0)`,
      metaLeads: sql<string>`COALESCE(SUM(${metaDailyPerformance.metaLeads}), 0)`,
      websiteRegs: sql<string>`COALESCE(SUM(${metaDailyPerformance.websiteRegistrationsCompleted}), 0)`,
    })
    .from(metaDailyPerformance)
    .where(and(gte(metaDailyPerformance.date, range.from), lte(metaDailyPerformance.date, range.to)));

  // CRM funnel from prospects (by createdDate)
  const leadsAgg = await db
    .select({
      crmLeads: sql<string>`COUNT(*)`,
      mql: sql<string>`COUNT(${prospects.mqlAt})`,
      sqlV: sql<string>`COUNT(${prospects.sqlAt})`,
      won: sql<string>`COUNT(${prospects.wonAt})`,
      lost: sql<string>`COUNT(${prospects.lostAt})`,
    })
    .from(prospects)
    .where(
      and(
        gte(prospects.createdDate, new Date(range.from)),
        lte(prospects.createdDate, new Date(range.to + "T23:59:59"))
      )
    );

  // Deals & revenue (by createdAt? — use wonDate for revenue, closeDate fallback)
  const dealsAgg = await db
    .select({
      total: sql<string>`COUNT(*)`,
      won: sql<string>`COUNT(*) FILTER (WHERE ${deals.dealStatus} = 'won')`,
      lost: sql<string>`COUNT(*) FILTER (WHERE ${deals.dealStatus} = 'lost')`,
      revenue: sql<string>`COALESCE(SUM(${deals.actualRevenue}::numeric) FILTER (WHERE ${deals.dealStatus} = 'won'), 0)`,
      expected: sql<string>`COALESCE(SUM(${deals.expectedRevenue}::numeric), 0)`,
    })
    .from(deals)
    .where(
      and(
        gte(deals.createdAt, new Date(range.from)),
        lte(deals.createdAt, new Date(range.to + "T23:59:59"))
      )
    );

  const m: MetricsRow = {
    ...emptyMetrics(),
    spend: parseFloat(spendAgg[0]?.spend ?? "0"),
    impressions: parseInt(spendAgg[0]?.impressions ?? "0"),
    reach: parseInt(spendAgg[0]?.reach ?? "0"),
    clicks: parseInt(spendAgg[0]?.clicks ?? "0"),
    conversations: parseInt(spendAgg[0]?.conversations ?? "0"),
    replies: parseInt(spendAgg[0]?.replies ?? "0"),
    metaLeads: parseInt(spendAgg[0]?.metaLeads ?? "0"),
    websiteRegs: parseInt(spendAgg[0]?.websiteRegs ?? "0"),
    crmLeads: parseInt(leadsAgg[0]?.crmLeads ?? "0"),
    mql: parseInt(leadsAgg[0]?.mql ?? "0"),
    sql: parseInt(leadsAgg[0]?.sqlV ?? "0"),
    deals: parseInt(dealsAgg[0]?.total ?? "0"),
    dealsWon: parseInt(dealsAgg[0]?.won ?? "0"),
    dealsLost: parseInt(dealsAgg[0]?.lost ?? "0"),
    revenue: parseFloat(dealsAgg[0]?.revenue ?? "0"),
    expectedRevenue: parseFloat(dealsAgg[0]?.expected ?? "0"),
  };

  return deriveMetrics(m);
}

export async function getDailyTrend(range: DateRange) {
  const spend = await db
    .select({
      date: metaDailyPerformance.date,
      spend: sql<string>`COALESCE(SUM(${metaDailyPerformance.amountSpent}::numeric), 0)`,
      conversations: sql<string>`COALESCE(SUM(${metaDailyPerformance.messagingConversationsStarted}), 0)`,
      clicks: sql<string>`COALESCE(SUM(${metaDailyPerformance.clicks}), 0)`,
      impressions: sql<string>`COALESCE(SUM(${metaDailyPerformance.impressions}), 0)`,
    })
    .from(metaDailyPerformance)
    .where(and(gte(metaDailyPerformance.date, range.from), lte(metaDailyPerformance.date, range.to)))
    .groupBy(metaDailyPerformance.date)
    .orderBy(metaDailyPerformance.date);

  const leads = await db
    .select({
      date: sql<string>`DATE(${prospects.createdDate})`,
      leads: sql<string>`COUNT(*)`,
    })
    .from(prospects)
    .where(
      and(
        gte(prospects.createdDate, new Date(range.from)),
        lte(prospects.createdDate, new Date(range.to + "T23:59:59"))
      )
    )
    .groupBy(sql`DATE(${prospects.createdDate})`);

  const leadsByDate = new Map<string, number>();
  leads.forEach((l) => leadsByDate.set(l.date, parseInt(l.leads)));

  return spend.map((d) => ({
    date: d.date,
    spend: parseFloat(d.spend),
    conversations: parseInt(d.conversations),
    clicks: parseInt(d.clicks),
    impressions: parseInt(d.impressions),
    leads: leadsByDate.get(String(d.date)) ?? 0,
  }));
}

export async function getCampaignPerformance(range: DateRange) {
  // Aggregate spend per campaign
  const spendRows = await db
    .select({
      campaignId: metaDailyPerformance.campaignId,
      spend: sql<string>`COALESCE(SUM(${metaDailyPerformance.amountSpent}::numeric), 0)`,
      impressions: sql<string>`COALESCE(SUM(${metaDailyPerformance.impressions}), 0)`,
      clicks: sql<string>`COALESCE(SUM(${metaDailyPerformance.clicks}), 0)`,
      conversations: sql<string>`COALESCE(SUM(${metaDailyPerformance.messagingConversationsStarted}), 0)`,
    })
    .from(metaDailyPerformance)
    .where(and(gte(metaDailyPerformance.date, range.from), lte(metaDailyPerformance.date, range.to)))
    .groupBy(metaDailyPerformance.campaignId);

  const leadRows = await db
    .select({
      campaignId: prospects.campaignId,
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
    .groupBy(prospects.campaignId);

  const dealRows = await db
    .select({
      campaignId: deals.campaignId,
      revenue: sql<string>`COALESCE(SUM(${deals.actualRevenue}::numeric) FILTER (WHERE ${deals.dealStatus} = 'won'), 0)`,
      dealsWon: sql<string>`COUNT(*) FILTER (WHERE ${deals.dealStatus} = 'won')`,
      dealsTotal: sql<string>`COUNT(*)`,
    })
    .from(deals)
    .where(
      and(
        gte(deals.createdAt, new Date(range.from)),
        lte(deals.createdAt, new Date(range.to + "T23:59:59"))
      )
    )
    .groupBy(deals.campaignId);

  const all = await db.select().from(campaigns);

  const map = new Map<number, any>();
  all.forEach((c) =>
    map.set(c.id, {
      campaignId: c.id,
      campaignName: c.campaignName,
      objective: c.objective,
      status: c.status,
      ...emptyMetrics(),
    })
  );
  spendRows.forEach((r) => {
    if (!r.campaignId) return;
    const m = map.get(r.campaignId);
    if (!m) return;
    m.spend = parseFloat(r.spend);
    m.impressions = parseInt(r.impressions);
    m.clicks = parseInt(r.clicks);
    m.conversations = parseInt(r.conversations);
  });
  leadRows.forEach((r) => {
    if (!r.campaignId) return;
    const m = map.get(r.campaignId);
    if (!m) return;
    m.crmLeads = parseInt(r.leads);
    m.mql = parseInt(r.mql);
    m.sql = parseInt(r.sqlV);
  });
  dealRows.forEach((r) => {
    if (!r.campaignId) return;
    const m = map.get(r.campaignId);
    if (!m) return;
    m.revenue = parseFloat(r.revenue);
    m.dealsWon = parseInt(r.dealsWon);
    m.deals = parseInt(r.dealsTotal);
  });

  return Array.from(map.values()).map((m) => deriveMetrics(m));
}

export async function getFunnelCounts(range: DateRange) {
  const spendAgg = await db
    .select({
      reach: sql<string>`COALESCE(SUM(${metaDailyPerformance.reach}), 0)`,
      impressions: sql<string>`COALESCE(SUM(${metaDailyPerformance.impressions}), 0)`,
      clicks: sql<string>`COALESCE(SUM(${metaDailyPerformance.clicks}), 0)`,
      conversations: sql<string>`COALESCE(SUM(${metaDailyPerformance.messagingConversationsStarted}), 0)`,
    })
    .from(metaDailyPerformance)
    .where(and(gte(metaDailyPerformance.date, range.from), lte(metaDailyPerformance.date, range.to)));

  const leadsAgg = await db
    .select({
      crmLeads: sql<string>`COUNT(*)`,
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
    );

  // Opportunities = prospects in the cohort that have at least one open or closed deal.
  const oppAgg = await db
    .select({ n: sql<string>`COUNT(DISTINCT ${prospects.id})` })
    .from(prospects)
    .innerJoin(deals, eq(deals.prospectId, prospects.id))
    .where(
      and(
        gte(prospects.createdDate, new Date(range.from)),
        lte(prospects.createdDate, new Date(range.to + "T23:59:59"))
      )
    );

  return {
    reach: parseInt(spendAgg[0]?.reach ?? "0"),
    impressions: parseInt(spendAgg[0]?.impressions ?? "0"),
    clicks: parseInt(spendAgg[0]?.clicks ?? "0"),
    conversations: parseInt(spendAgg[0]?.conversations ?? "0"),
    leads: parseInt(leadsAgg[0]?.crmLeads ?? "0"),
    mql: parseInt(leadsAgg[0]?.mql ?? "0"),
    sql: parseInt(leadsAgg[0]?.sqlV ?? "0"),
    opportunities: parseInt(oppAgg[0]?.n ?? "0"),
    won: parseInt(leadsAgg[0]?.won ?? "0"),
  };
}

export async function getSalesLeaderboard(range: DateRange) {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      leads: sql<string>`COUNT(${prospects.id})`,
      mql: sql<string>`COUNT(${prospects.mqlAt})`,
      sqlV: sql<string>`COUNT(${prospects.sqlAt})`,
      won: sql<string>`COUNT(${prospects.wonAt})`,
    })
    .from(users)
    .leftJoin(
      prospects,
      and(
        eq(prospects.assignedSalesId, users.id),
        gte(prospects.createdDate, new Date(range.from)),
        lte(prospects.createdDate, new Date(range.to + "T23:59:59"))
      )
    )
    .groupBy(users.id, users.name);

  // revenue per user
  const revRows = await db
    .select({
      userId: deals.salesOwnerId,
      revenue: sql<string>`COALESCE(SUM(${deals.actualRevenue}::numeric) FILTER (WHERE ${deals.dealStatus} = 'won'), 0)`,
      dealsWon: sql<string>`COUNT(*) FILTER (WHERE ${deals.dealStatus} = 'won')`,
    })
    .from(deals)
    .where(
      and(
        gte(deals.createdAt, new Date(range.from)),
        lte(deals.createdAt, new Date(range.to + "T23:59:59"))
      )
    )
    .groupBy(deals.salesOwnerId);

  const revMap = new Map(revRows.map((r) => [r.userId, r]));

  return rows
    .filter((r) => r.userId)
    .map((r) => {
      const rev = revMap.get(r.userId);
      const leads = parseInt(r.leads);
      const won = parseInt(rev?.dealsWon ?? "0");
      return {
        userId: r.userId,
        name: r.name,
        leads,
        mql: parseInt(r.mql),
        sql: parseInt(r.sqlV),
        won,
        revenue: parseFloat(rev?.revenue ?? "0"),
        winRate: leads > 0 ? won / leads : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getStageDistribution() {
  const stages = await db.select().from(leadStages);
  const counts = await db
    .select({
      stageId: prospects.leadStageId,
      n: sql<string>`COUNT(*)`,
    })
    .from(prospects)
    .groupBy(prospects.leadStageId);
  const cmap = new Map(counts.map((c) => [c.stageId, parseInt(c.n)]));
  return stages
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((s) => ({ stageId: s.id, stageName: s.stageName, stageOrder: s.stageOrder, count: cmap.get(s.id) ?? 0 }));
}
