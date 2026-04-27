import { db } from "../db";
import { campaigns, adSets, ads } from "../../shared/schema";
import { eq, ilike, sql } from "drizzle-orm";

interface AttributionInput {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  campaignNameSnapshot?: string | null;
  adsetNameSnapshot?: string | null;
  adNameSnapshot?: string | null;
  channel?: string | null;
  source?: string | null;
}

export interface AttributionResult {
  campaignId: number | null;
  adsetId: number | null;
  adId: number | null;
  campaignNameSnapshot: string | null;
  adsetNameSnapshot: string | null;
  adNameSnapshot: string | null;
  isAttributed: boolean;
  channel: string | null;
}

/**
 * Attribution priority chain (highest priority first):
 *  1. Platform IDs (utm_term=platform_ad_id, utm_content=platform_adset_id, utm_campaign=platform_campaign_id)
 *  2. utm_campaign / utm_content / utm_term as names → match campaign/adset/ad names (case-insensitive)
 *  3. campaignNameSnapshot / adsetNameSnapshot / adNameSnapshot → exact match
 *  4. channel/source heuristic → unattributed (channel only)
 *
 * Each level only fills slots that are still empty after the previous level,
 * so a partial UTM ladder still benefits from the snapshot fallback.
 */
export async function attributeProspect(input: AttributionInput): Promise<AttributionResult> {
  const result: AttributionResult = {
    campaignId: null,
    adsetId: null,
    adId: null,
    campaignNameSnapshot: input.campaignNameSnapshot ?? input.utmCampaign ?? null,
    adsetNameSnapshot: input.adsetNameSnapshot ?? input.utmContent ?? null,
    adNameSnapshot: input.adNameSnapshot ?? input.utmTerm ?? null,
    isAttributed: false,
    channel: input.channel ?? input.utmSource ?? input.source ?? null,
  };

  // Priority 1: platform IDs — try each UTM as a possible platform_*_id.
  // Marketers often pass platform IDs (e.g. utm_term=23845678901234567) instead of names.
  if (input.utmTerm) {
    const ad = await db
      .select()
      .from(ads)
      .where(eq(ads.platformAdId, String(input.utmTerm)))
      .limit(1);
    if (ad[0]) {
      result.adId = ad[0].id;
      result.adsetId = ad[0].adsetId ?? null;
      result.campaignId = ad[0].campaignId ?? null;
      result.adNameSnapshot = ad[0].adName;
    }
  }
  if (!result.adsetId && input.utmContent) {
    const a = await db
      .select()
      .from(adSets)
      .where(eq(adSets.platformAdsetId, String(input.utmContent)))
      .limit(1);
    if (a[0]) {
      result.adsetId = a[0].id;
      if (!result.campaignId) result.campaignId = a[0].campaignId ?? null;
      result.adsetNameSnapshot = a[0].adsetName;
    }
  }
  if (!result.campaignId && input.utmCampaign) {
    const c = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.platformCampaignId, String(input.utmCampaign)))
      .limit(1);
    if (c[0]) {
      result.campaignId = c[0].id;
      result.campaignNameSnapshot = c[0].campaignName;
    }
  }

  // Priority 2: utm_campaign as a campaign name
  if (!result.campaignId && input.utmCampaign) {
    const c = await db
      .select()
      .from(campaigns)
      .where(sql`LOWER(${campaigns.campaignName}) = LOWER(${input.utmCampaign})`)
      .limit(1);
    if (c[0]) {
      result.campaignId = c[0].id;
      result.campaignNameSnapshot = c[0].campaignName;
    }
  }

  // Try ad_set match by utm_content (only if Priority 1 didn't already resolve it)
  if (!result.adsetId && input.utmContent && result.campaignId) {
    const a = await db
      .select()
      .from(adSets)
      .where(
        sql`${adSets.campaignId} = ${result.campaignId} AND LOWER(${adSets.adsetName}) = LOWER(${input.utmContent})`
      )
      .limit(1);
    if (a[0]) {
      result.adsetId = a[0].id;
      result.adsetNameSnapshot = a[0].adsetName;
    }
  }

  // Try ad match by utm_term (only if Priority 1 didn't already resolve it)
  if (!result.adId && input.utmTerm && result.adsetId) {
    const ad = await db
      .select()
      .from(ads)
      .where(
        sql`${ads.adsetId} = ${result.adsetId} AND LOWER(${ads.adName}) = LOWER(${input.utmTerm})`
      )
      .limit(1);
    if (ad[0]) {
      result.adId = ad[0].id;
      result.adNameSnapshot = ad[0].adName;
    }
  }

  // Priority 3: name snapshot fallback
  if (!result.campaignId && input.campaignNameSnapshot) {
    const c = await db
      .select()
      .from(campaigns)
      .where(sql`LOWER(${campaigns.campaignName}) = LOWER(${input.campaignNameSnapshot})`)
      .limit(1);
    if (c[0]) {
      result.campaignId = c[0].id;
      result.campaignNameSnapshot = c[0].campaignName;
    }
  }
  if (!result.adsetId && input.adsetNameSnapshot && result.campaignId) {
    const a = await db
      .select()
      .from(adSets)
      .where(
        sql`${adSets.campaignId} = ${result.campaignId} AND LOWER(${adSets.adsetName}) = LOWER(${input.adsetNameSnapshot})`
      )
      .limit(1);
    if (a[0]) {
      result.adsetId = a[0].id;
      result.adsetNameSnapshot = a[0].adsetName;
    }
  }
  if (!result.adId && input.adNameSnapshot && result.adsetId) {
    const ad = await db
      .select()
      .from(ads)
      .where(
        sql`${ads.adsetId} = ${result.adsetId} AND LOWER(${ads.adName}) = LOWER(${input.adNameSnapshot})`
      )
      .limit(1);
    if (ad[0]) {
      result.adId = ad[0].id;
      result.adNameSnapshot = ad[0].adName;
    }
  }

  result.isAttributed = !!(result.campaignId || result.adsetId || result.adId);

  return result;
}

/**
 * Re-run attribution for all unattributed prospects.
 * Returns count of newly attributed.
 */
export async function reattributeAllProspects(): Promise<number> {
  const { prospects } = await import("../../shared/schema");
  const all = await db.select().from(prospects);
  let updated = 0;
  for (const p of all) {
    if (p.campaignId && p.adsetId && p.adId) continue;
    const att = await attributeProspect({
      utmSource: p.utmSource,
      utmMedium: p.utmMedium,
      utmCampaign: p.utmCampaign,
      utmContent: p.utmContent,
      utmTerm: p.utmTerm,
      campaignNameSnapshot: p.campaignNameSnapshot,
      adsetNameSnapshot: p.adsetNameSnapshot,
      adNameSnapshot: p.adNameSnapshot,
      channel: p.channel,
      source: p.source,
    });
    if (att.isAttributed && (!p.campaignId || !p.adsetId || !p.adId)) {
      await db
        .update(prospects)
        .set({
          campaignId: att.campaignId ?? p.campaignId,
          adsetId: att.adsetId ?? p.adsetId,
          adId: att.adId ?? p.adId,
          campaignNameSnapshot: att.campaignNameSnapshot ?? p.campaignNameSnapshot,
          adsetNameSnapshot: att.adsetNameSnapshot ?? p.adsetNameSnapshot,
          adNameSnapshot: att.adNameSnapshot ?? p.adNameSnapshot,
          isAttributed: true,
          updatedAt: new Date(),
        })
        .where(eq(prospects.id, p.id));
      updated++;
    }
  }
  return updated;
}
