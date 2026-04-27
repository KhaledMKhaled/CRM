import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { db } from "../db";
import { metaDailyPerformance, campaigns, adSets, ads, imports } from "../../shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { audit } from "../lib/audit";
import { yearMonth, isoWeek, yearQuarter } from "../../shared/calculations";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/daily", requireAuth, requirePermission(PERMISSIONS.META_ADS_VIEW), async (req, res) => {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const where: any[] = [];
  if (from) where.push(gte(metaDailyPerformance.date, from));
  if (to) where.push(lte(metaDailyPerformance.date, to));
  const rows = await db
    .select({
      id: metaDailyPerformance.id,
      date: metaDailyPerformance.date,
      campaignId: metaDailyPerformance.campaignId,
      campaignName: campaigns.campaignName,
      adsetId: metaDailyPerformance.adsetId,
      adsetName: adSets.adsetName,
      adId: metaDailyPerformance.adId,
      adName: ads.adName,
      amountSpent: metaDailyPerformance.amountSpent,
      impressions: metaDailyPerformance.impressions,
      reach: metaDailyPerformance.reach,
      clicks: metaDailyPerformance.clicks,
      messagingConversationsStarted: metaDailyPerformance.messagingConversationsStarted,
      messagingConversationsReplied: metaDailyPerformance.messagingConversationsReplied,
      metaLeads: metaDailyPerformance.metaLeads,
      websiteRegistrationsCompleted: metaDailyPerformance.websiteRegistrationsCompleted,
    })
    .from(metaDailyPerformance)
    .leftJoin(campaigns, eq(metaDailyPerformance.campaignId, campaigns.id))
    .leftJoin(adSets, eq(metaDailyPerformance.adsetId, adSets.id))
    .leftJoin(ads, eq(metaDailyPerformance.adId, ads.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(metaDailyPerformance.date))
    .limit(2000);
  res.json(rows);
});

// Import: returns suggested mapping (peeked headers)
router.post("/import/parse", requireAuth, requirePermission(PERMISSIONS.IMPORTS_CREATE), upload.single("file"), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  const name = req.file.originalname.toLowerCase();
  let rows: any[] = [];
  try {
    if (name.endsWith(".csv")) {
      const txt = req.file.buffer.toString("utf8");
      const r = Papa.parse(txt, { header: true, skipEmptyLines: true });
      rows = r.data as any[];
    } else {
      const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
    }
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
  const headers = rows.length ? Object.keys(rows[0]) : [];
  res.json({ headers, sampleRows: rows.slice(0, 5), totalRows: rows.length, fileName: req.file.originalname, raw: rows });
});

// Common Meta column mapping helpers
function pickNum(row: any, keys: string[], def = 0): number {
  for (const k of keys) {
    if (k in row && row[k] !== null && row[k] !== "") {
      const n = typeof row[k] === "number" ? row[k] : parseFloat(String(row[k]).replace(/[, ]/g, ""));
      if (!isNaN(n)) return n;
    }
  }
  return def;
}

function pickStr(row: any, keys: string[]): string | null {
  for (const k of keys) if (k in row && row[k] !== null && row[k] !== "") return String(row[k]).trim();
  return null;
}

function pickDate(row: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (!v) continue;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const d = new Date(String(v));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

const COL_DATE = ["Day", "Date", "Reporting starts", "date", "day"];
const COL_CAMPAIGN = ["Campaign name", "Campaign Name", "campaign_name", "Campaign"];
const COL_ADSET = ["Ad set name", "Ad Set Name", "Adset Name", "adset_name", "Ad Set"];
const COL_AD = ["Ad name", "Ad Name", "ad_name", "Ad"];
const COL_SPEND = ["Amount spent (EGP)", "Amount spent (USD)", "Amount spent", "Spend", "amount_spent"];
const COL_IMP = ["Impressions", "impressions"];
const COL_REACH = ["Reach", "reach"];
const COL_CLICKS = ["Clicks (all)", "Clicks", "clicks"];
const COL_LINK_CLICKS = ["Link clicks", "link_clicks"];
const COL_LPV = ["Landing page views", "landing_page_views"];
const COL_FREQ = ["Frequency", "frequency"];
const COL_CTR = ["CTR (all)", "CTR", "ctr"];
const COL_CPC = ["CPC (all)", "CPC", "cpc"];
const COL_CPM = ["CPM (cost per 1,000 impressions)", "CPM", "cpm"];
const COL_MSG_STARTED = ["Messaging conversations started", "Conversations started", "messaging_conversations_started"];
const COL_MSG_REPLIED = ["Messaging conversations replied", "messaging_conversations_replied"];
const COL_MSG_NEW = ["New messaging contacts", "new_messaging_contacts"];
const COL_MSG_TOTAL = ["Total messaging contacts", "total_messaging_contacts"];
const COL_WHATSAPP = ["WhatsApp messaging conversations started", "whatsapp_conversations"];
const COL_MESSENGER = ["Messenger messaging conversations started", "messenger_conversations"];
const COL_IG_DM = ["Instagram DM conversations started", "instagram_dm_conversations"];
const COL_LEADS = ["Meta leads", "Leads", "leads"];
const COL_PURCHASES = ["Purchases", "purchases"];
const COL_REGS = ["Website registrations completed", "Registrations completed", "Website registrations"];
const COL_OBJECTIVE = ["Campaign objective", "Objective", "objective"];

router.post("/import/commit", requireAuth, requirePermission(PERMISSIONS.IMPORTS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const body = z.object({
      rows: z.array(z.record(z.any())),
      fileName: z.string().optional(),
      autoCreateEntities: z.boolean().optional().default(true),
    }).parse(req.body);

    const importRow = await db
      .insert(imports)
      .values({
        importType: "meta_daily",
        fileName: body.fileName,
        status: "processing",
        uploadedBy: req.user!.id,
      })
      .returning();

    let inserted = 0,
      updated = 0,
      skipped = 0,
      campaignsCreated = 0,
      adsetsCreated = 0,
      adsCreated = 0;
    const errors: string[] = [];

    // Cache lookups
    const allC = await db.select().from(campaigns);
    const allAS = await db.select().from(adSets);
    const allA = await db.select().from(ads);
    const cMap = new Map(allC.map((c) => [c.campaignName.toLowerCase(), c]));
    const asMap = new Map(allAS.map((a) => [`${a.campaignId}::${a.adsetName.toLowerCase()}`, a]));
    const aMap = new Map(allA.map((a) => [`${a.adsetId}::${a.adName.toLowerCase()}`, a]));

    for (const r of body.rows) {
      try {
        const date = pickDate(r, COL_DATE);
        if (!date) {
          skipped++;
          continue;
        }
        const campaignName = pickStr(r, COL_CAMPAIGN);
        const adsetName = pickStr(r, COL_ADSET);
        const adName = pickStr(r, COL_AD);
        const objective = pickStr(r, COL_OBJECTIVE);

        let campaignId: number | null = null;
        let adsetId: number | null = null;
        let adId: number | null = null;

        if (campaignName) {
          const k = campaignName.toLowerCase();
          let c = cMap.get(k);
          if (!c && body.autoCreateEntities) {
            const ins = await db
              .insert(campaigns)
              .values({ campaignName, objective, status: "active" })
              .returning();
            c = ins[0];
            cMap.set(k, c);
            campaignsCreated++;
          }
          if (c) campaignId = c.id;
        }

        if (adsetName && campaignId) {
          const k = `${campaignId}::${adsetName.toLowerCase()}`;
          let a = asMap.get(k);
          if (!a && body.autoCreateEntities) {
            const ins = await db
              .insert(adSets)
              .values({ campaignId, adsetName, status: "active" })
              .returning();
            a = ins[0];
            asMap.set(k, a);
            adsetsCreated++;
          }
          if (a) adsetId = a.id;
        }

        if (adName && adsetId) {
          const k = `${adsetId}::${adName.toLowerCase()}`;
          let a = aMap.get(k);
          if (!a && body.autoCreateEntities) {
            const ins = await db
              .insert(ads)
              .values({ campaignId, adsetId, adName, status: "active" })
              .returning();
            a = ins[0];
            aMap.set(k, a);
            adsCreated++;
          }
          if (a) adId = a.id;
        }

        const dt = new Date(date + "T00:00:00Z");
        const month = yearMonth(dt);
        const week = isoWeek(dt);
        const quarter = yearQuarter(dt);

        const values = {
          date,
          quarter,
          month,
          week,
          campaignId,
          adsetId,
          adId,
          channel: "Meta",
          amountSpent: pickNum(r, COL_SPEND).toString(),
          impressions: pickNum(r, COL_IMP),
          reach: pickNum(r, COL_REACH),
          clicks: pickNum(r, COL_CLICKS),
          linkClicks: pickNum(r, COL_LINK_CLICKS),
          landingPageViews: pickNum(r, COL_LPV),
          frequency: pickNum(r, COL_FREQ).toString(),
          ctr: pickNum(r, COL_CTR).toString(),
          cpc: pickNum(r, COL_CPC).toString(),
          cpm: pickNum(r, COL_CPM).toString(),
          messagingConversationsStarted: pickNum(r, COL_MSG_STARTED),
          messagingConversationsReplied: pickNum(r, COL_MSG_REPLIED),
          newMessagingContacts: pickNum(r, COL_MSG_NEW),
          totalMessagingContacts: pickNum(r, COL_MSG_TOTAL),
          whatsappConversations: pickNum(r, COL_WHATSAPP),
          messengerConversations: pickNum(r, COL_MESSENGER),
          instagramDmConversations: pickNum(r, COL_IG_DM),
          metaLeads: pickNum(r, COL_LEADS),
          purchases: pickNum(r, COL_PURCHASES),
          websiteRegistrationsCompleted: pickNum(r, COL_REGS),
          rawJson: r,
        };

        // upsert by (date, campaignId, adsetId, adId)
        const existing = await db
          .select()
          .from(metaDailyPerformance)
          .where(
            and(
              eq(metaDailyPerformance.date, date),
              campaignId
                ? eq(metaDailyPerformance.campaignId, campaignId)
                : sql`${metaDailyPerformance.campaignId} IS NULL`,
              adsetId
                ? eq(metaDailyPerformance.adsetId, adsetId)
                : sql`${metaDailyPerformance.adsetId} IS NULL`,
              adId
                ? eq(metaDailyPerformance.adId, adId)
                : sql`${metaDailyPerformance.adId} IS NULL`
            )
          )
          .limit(1);

        if (existing[0]) {
          await db
            .update(metaDailyPerformance)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(metaDailyPerformance.id, existing[0].id));
          updated++;
        } else {
          await db.insert(metaDailyPerformance).values(values);
          inserted++;
        }
      } catch (e: any) {
        errors.push(`row error: ${e.message}`);
        skipped++;
      }
    }

    const summary = { inserted, updated, skipped, errors: errors.slice(0, 20), campaignsCreated, adsetsCreated, adsCreated };
    await db
      .update(imports)
      .set({ status: "completed", summaryJson: summary, updatedAt: new Date() })
      .where(eq(imports.id, importRow[0].id));
    await audit({ userId: req.user!.id, entityType: "import", entityId: importRow[0].id, action: "meta_import", newValue: summary });
    res.json({ importId: importRow[0].id, summary });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/imports", requireAuth, requirePermission(PERMISSIONS.IMPORTS_CREATE), async (_req, res) => {
  const rows = await db.select().from(imports).orderBy(desc(imports.createdAt)).limit(50);
  res.json(rows);
});

export default router;
