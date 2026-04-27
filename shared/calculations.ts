// Centralized calculation engine — used by both server and client.
// Safe division: returns 0 (or null) when denominator is 0 or missing.

export function safeDiv(numerator: number, denominator: number, fallback: number | null = 0): number | null {
  if (!denominator || isNaN(denominator) || isNaN(numerator)) return fallback;
  return numerator / denominator;
}

export function num(v: any, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? fallback : n;
}

// =====================================================
// Basic Meta metrics
// =====================================================

export function ctr(clicks: number, impressions: number) {
  return safeDiv(clicks, impressions);
}
export function cpc(spend: number, clicks: number) {
  return safeDiv(spend, clicks);
}
export function cpm(spend: number, impressions: number) {
  const v = safeDiv(spend, impressions);
  return v === null ? null : v * 1000;
}
export function costPerConversation(spend: number, conv: number) {
  return safeDiv(spend, conv);
}
export function replyRate(replies: number, conv: number) {
  return safeDiv(replies, conv);
}
export function costPerReply(spend: number, replies: number) {
  return safeDiv(spend, replies);
}
export function metaLeadRate(leads: number, conv: number) {
  return safeDiv(leads, conv);
}
export function websiteRegRate(regs: number, clicks: number) {
  return safeDiv(regs, clicks);
}

// =====================================================
// Cost Metrics
// =====================================================

export function cpl(spend: number, leads: number) {
  return safeDiv(spend, leads);
}
export function costPerMql(spend: number, mql: number) {
  return safeDiv(spend, mql);
}
export function costPerSql(spend: number, sql: number) {
  return safeDiv(spend, sql);
}
export function cac(spend: number, dealsWon: number) {
  return safeDiv(spend, dealsWon);
}

// =====================================================
// Funnel rates
// =====================================================

export function leadToMqlRate(mql: number, leads: number) {
  return safeDiv(mql, leads);
}
export function mqlToSqlRate(sql: number, mql: number) {
  return safeDiv(sql, mql);
}
export function sqlToDealRate(deals: number, sql: number) {
  return safeDiv(deals, sql);
}
export function dealWinRate(won: number, total: number) {
  return safeDiv(won, total);
}
export function leadToDealRate(won: number, leads: number) {
  return safeDiv(won, leads);
}

// =====================================================
// Revenue metrics
// =====================================================

export function roas(revenue: number, spend: number) {
  return safeDiv(revenue, spend);
}
export function profit(revenue: number, spend: number) {
  return num(revenue) - num(spend);
}
export function roi(revenue: number, spend: number) {
  return safeDiv(profit(revenue, spend), spend);
}
export function avgDealSize(revenue: number, won: number) {
  return safeDiv(revenue, won);
}
export function revenuePerLead(revenue: number, leads: number) {
  return safeDiv(revenue, leads);
}
export function revenuePerMql(revenue: number, mql: number) {
  return safeDiv(revenue, mql);
}
export function revenuePerSql(revenue: number, sql: number) {
  return safeDiv(revenue, sql);
}

// =====================================================
// Time grouping helpers
// =====================================================

export function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function yearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function yearQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// =====================================================
// Aggregation helpers
// =====================================================

export interface MetricsRow {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversations: number;
  replies: number;
  metaLeads: number;
  websiteRegs: number;
  crmLeads: number;
  mql: number;
  sql: number;
  deals: number;
  dealsWon: number;
  dealsLost: number;
  revenue: number;
  expectedRevenue: number;
}

export function emptyMetrics(): MetricsRow {
  return {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    conversations: 0,
    replies: 0,
    metaLeads: 0,
    websiteRegs: 0,
    crmLeads: 0,
    mql: 0,
    sql: 0,
    deals: 0,
    dealsWon: 0,
    dealsLost: 0,
    revenue: 0,
    expectedRevenue: 0,
  };
}

export function deriveMetrics(m: MetricsRow) {
  return {
    ...m,
    ctr: ctr(m.clicks, m.impressions) ?? 0,
    cpc: cpc(m.spend, m.clicks) ?? 0,
    cpm: cpm(m.spend, m.impressions) ?? 0,
    costPerConversation: costPerConversation(m.spend, m.conversations) ?? 0,
    replyRate: replyRate(m.replies, m.conversations) ?? 0,
    costPerReply: costPerReply(m.spend, m.replies) ?? 0,
    cpl: cpl(m.spend, m.crmLeads) ?? 0,
    costPerMql: costPerMql(m.spend, m.mql) ?? 0,
    costPerSql: costPerSql(m.spend, m.sql) ?? 0,
    cac: cac(m.spend, m.dealsWon) ?? 0,
    leadToMqlRate: leadToMqlRate(m.mql, m.crmLeads) ?? 0,
    mqlToSqlRate: mqlToSqlRate(m.sql, m.mql) ?? 0,
    sqlToDealRate: sqlToDealRate(m.deals, m.sql) ?? 0,
    dealWinRate: dealWinRate(m.dealsWon, m.deals) ?? 0,
    leadToDealRate: leadToDealRate(m.dealsWon, m.crmLeads) ?? 0,
    roas: roas(m.revenue, m.spend) ?? 0,
    profit: profit(m.revenue, m.spend),
    roi: roi(m.revenue, m.spend) ?? 0,
    avgDealSize: avgDealSize(m.revenue, m.dealsWon) ?? 0,
    revenuePerLead: revenuePerLead(m.revenue, m.crmLeads) ?? 0,
    revenuePerMql: revenuePerMql(m.revenue, m.mql) ?? 0,
    revenuePerSql: revenuePerSql(m.revenue, m.sql) ?? 0,
  };
}

// =====================================================
// Formatters
// =====================================================

export function formatCurrency(v: number | null | undefined, currency = "EGP"): string {
  if (v === null || v === undefined || isNaN(v)) return `${currency} 0`;
  return `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "0";
  return Math.round(v).toLocaleString();
}

export function formatPercent(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || isNaN(v)) return "0%";
  return `${(v * 100).toFixed(digits)}%`;
}

export function formatRoas(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return "0×";
  return `${v.toFixed(2)}×`;
}
