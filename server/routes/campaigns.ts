import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { campaigns, adSets, ads } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { audit } from "../lib/audit";

const router = Router();

// CAMPAIGNS
router.get("/", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (_req, res) => {
  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  res.json(rows);
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

// AD SETS
router.get("/adsets", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
  const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
  const where = campaignId ? eq(adSets.campaignId, campaignId) : undefined;
  const rows = await db.select().from(adSets).where(where).orderBy(desc(adSets.createdAt));
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

// ADS
router.get("/ads", requireAuth, requirePermission(PERMISSIONS.CAMPAIGNS_VIEW), async (req, res) => {
  const adsetId = req.query.adsetId ? parseInt(req.query.adsetId as string) : undefined;
  const where = adsetId ? eq(ads.adsetId, adsetId) : undefined;
  const rows = await db.select().from(ads).where(where).orderBy(desc(ads.createdAt));
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
