import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { campaigns, adSets, ads } from "../../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { audit } from "../lib/audit";

const router = Router();

// CAMPAIGNS
router.get("/", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (_req, res) => {
  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  res.json(rows);
});

// Single-resource GETs.
// NOTE: in Express 5 path-to-regexp does not allow inline regex constraints, so
// we accept any :id and validate it's numeric to avoid clashing with the
// /adsets and /ads child routes (those are declared as more specific paths
// below and Express's router prefers exact static segments over :id).
router.get("/adsets/:id", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
  const [row] = await db.select().from(adSets).where(eq(adSets.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "ad set not found" });
  res.json(row);
});

router.get("/ads/:id", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
  const [row] = await db.select().from(ads).where(eq(ads.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "ad not found" });
  res.json(row);
});

router.get("/:id", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
  const id = parseInt(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "campaign not found" });
  res.json(row);
});

const campaignSchema = z.object({
  campaignName: z.string().min(1),
  objective: z.string().optional(),
  buyingType: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().nonnegative().optional(),
  platformCampaignId: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const c = campaignSchema.parse(req.body);
    const inserted = await db
      .insert(campaigns)
      .values({
        ...c,
        startDate: c.startDate || null,
        endDate: c.endDate || null,
        budget: c.budget?.toString(),
      })
      .returning();
    await audit({ userId: req.user!.id, entityType: "campaign", entityId: inserted[0].id, action: "create", newValue: inserted[0] });
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const c = campaignSchema.partial().parse(req.body);
    const updates: any = { ...c, updatedAt: new Date() };
    if (c.budget !== undefined) updates.budget = c.budget.toString();
    const u = await db.update(campaigns).set(updates).where(eq(campaigns.id, id)).returning();
    await audit({ userId: req.user!.id, entityType: "campaign", entityId: id, action: "update", newValue: u[0] });
    res.json(u[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// AD SETS ─ flat list with joined campaign name
router.get("/adsets", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
  const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
  let query = db
    .select({
      id: adSets.id,
      campaignId: adSets.campaignId,
      campaignName: campaigns.campaignName,
      adsetName: adSets.adsetName,
      audience: adSets.audience,
      placement: adSets.placement,
      optimizationGoal: adSets.optimizationGoal,
      status: adSets.status,
      budget: adSets.budget,
      startDate: adSets.startDate,
      endDate: adSets.endDate,
      platformAdsetId: adSets.platformAdsetId,
      notes: adSets.notes,
      createdAt: adSets.createdAt,
      updatedAt: adSets.updatedAt,
    })
    .from(adSets)
    .leftJoin(campaigns, eq(adSets.campaignId, campaigns.id))
    .$dynamic();
  if (campaignId) query = query.where(eq(adSets.campaignId, campaignId)) as any;
  const rows = await query.orderBy(desc(adSets.createdAt));
  res.json(rows);
});

const adsetSchema = z.object({
  campaignId: z.number().int(),
  adsetName: z.string().min(1),
  audience: z.string().optional(),
  placement: z.string().optional(),
  optimizationGoal: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().nonnegative().optional(),
});

router.post("/adsets", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const a = adsetSchema.parse(req.body);
    const inserted = await db
      .insert(adSets)
      .values({ ...a, startDate: a.startDate || null, endDate: a.endDate || null, budget: a.budget?.toString() })
      .returning();
    await audit({ userId: req.user!.id, entityType: "adset", entityId: inserted[0].id, action: "create", newValue: inserted[0] });
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/adsets/:id", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const a = adsetSchema.partial().parse(req.body);
    const updates: any = { ...a, updatedAt: new Date() };
    if (a.budget !== undefined) updates.budget = a.budget.toString();
    const u = await db.update(adSets).set(updates).where(eq(adSets.id, id)).returning();
    res.json(u[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ADS ─ flat list with joined campaign + adset names
router.get("/ads", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
  const adsetId = req.query.adsetId ? parseInt(req.query.adsetId as string) : undefined;
  const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
  let query = db
    .select({
      id: ads.id,
      campaignId: ads.campaignId,
      campaignName: campaigns.campaignName,
      adsetId: ads.adsetId,
      adsetName: adSets.adsetName,
      adName: ads.adName,
      creativeName: ads.creativeName,
      creativeType: ads.creativeType,
      primaryText: ads.primaryText,
      headline: ads.headline,
      cta: ads.cta,
      status: ads.status,
      platformAdId: ads.platformAdId,
      notes: ads.notes,
      createdAt: ads.createdAt,
      updatedAt: ads.updatedAt,
    })
    .from(ads)
    .leftJoin(adSets, eq(ads.adsetId, adSets.id))
    .leftJoin(campaigns, eq(ads.campaignId, campaigns.id))
    .$dynamic();
  if (adsetId) query = query.where(eq(ads.adsetId, adsetId)) as any;
  else if (campaignId) query = query.where(eq(ads.campaignId, campaignId)) as any;
  const rows = await query.orderBy(desc(ads.createdAt));
  res.json(rows);
});

const adSchema = z.object({
  campaignId: z.number().int(),
  adsetId: z.number().int(),
  adName: z.string().min(1),
  creativeName: z.string().optional(),
  creativeType: z.string().optional(),
  primaryText: z.string().optional(),
  headline: z.string().optional(),
  cta: z.string().optional(),
  status: z.string().optional(),
});

router.post("/ads", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const a = adSchema.parse(req.body);
    const inserted = await db.insert(ads).values(a).returning();
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
