import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { deals, prospects, products, users, leadStages } from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { audit } from "../lib/audit";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.DEALS_VIEW), async (_req, res) => {
  const rows = await db
    .select({
      id: deals.id,
      prospectId: deals.prospectId,
      prospectName: prospects.fullName,
      dealName: deals.dealName,
      dealStage: deals.dealStage,
      dealStatus: deals.dealStatus,
      expectedRevenue: deals.expectedRevenue,
      actualRevenue: deals.actualRevenue,
      currency: deals.currency,
      probability: deals.probability,
      closeDate: deals.closeDate,
      wonDate: deals.wonDate,
      productId: deals.productId,
      productName: products.productName,
      salesOwnerId: deals.salesOwnerId,
      salesOwnerName: users.name,
      campaignId: deals.campaignId,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .leftJoin(prospects, eq(deals.prospectId, prospects.id))
    .leftJoin(products, eq(deals.productId, products.id))
    .leftJoin(users, eq(deals.salesOwnerId, users.id))
    .orderBy(desc(deals.createdAt));
  res.json(rows);
});

const dealSchema = z.object({
  prospectId: z.number().int(),
  dealName: z.string().optional(),
  dealStage: z.string().optional(),
  dealStatus: z.enum(["open", "won", "lost"]).default("open"),
  expectedRevenue: z.number().nonnegative().optional(),
  actualRevenue: z.number().nonnegative().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  closeDate: z.string().optional().nullable(),
  productId: z.number().int().optional().nullable(),
  notes: z.string().optional(),
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.DEALS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const d = dealSchema.parse(req.body);
    const p = await db.select().from(prospects).where(eq(prospects.id, d.prospectId)).limit(1);
    if (!p[0]) return res.status(400).json({ error: "prospect not found" });

    const inserted = await db
      .insert(deals)
      .values({
        prospectId: d.prospectId,
        dealName: d.dealName ?? `Deal — ${p[0].fullName}`,
        dealStage: d.dealStage,
        dealStatus: d.dealStatus,
        expectedRevenue: d.expectedRevenue?.toString(),
        actualRevenue: d.actualRevenue?.toString(),
        probability: d.probability,
        closeDate: d.closeDate || null,
        wonDate: d.dealStatus === "won" ? new Date().toISOString().slice(0, 10) : null,
        lostDate: d.dealStatus === "lost" ? new Date().toISOString().slice(0, 10) : null,
        productId: d.productId,
        salesOwnerId: p[0].assignedSalesId,
        campaignId: p[0].campaignId,
        adsetId: p[0].adsetId,
        adId: p[0].adId,
        notes: d.notes,
      })
      .returning();

    await audit({
      userId: req.user!.id,
      entityType: "deal",
      entityId: inserted[0].id,
      action: "create",
      newValue: inserted[0],
    });
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id", requireAuth, requirePermission(PERMISSIONS.DEALS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "not found" });
    const d = dealSchema.partial().parse(req.body);
    const updates: any = { ...d, updatedAt: new Date() };
    if (d.expectedRevenue !== undefined) updates.expectedRevenue = d.expectedRevenue.toString();
    if (d.actualRevenue !== undefined) updates.actualRevenue = d.actualRevenue.toString();
    if (d.dealStatus === "won" && !existing[0].wonDate) {
      updates.wonDate = new Date().toISOString().slice(0, 10);
    }
    if (d.dealStatus === "lost" && !existing[0].lostDate) {
      updates.lostDate = new Date().toISOString().slice(0, 10);
    }
    const u = await db.update(deals).set(updates).where(eq(deals.id, id)).returning();
    await audit({
      userId: req.user!.id,
      entityType: "deal",
      entityId: id,
      action: "update",
      oldValue: existing[0],
      newValue: u[0],
    });

    // Sync prospect won/lost timestamps
    if (d.dealStatus === "won" || d.dealStatus === "lost") {
      const stages = await db.select().from(leadStages);
      const target = stages.find((s) =>
        d.dealStatus === "won" ? s.stageType === "won" : s.stageType === "lost"
      );
      const update: any = { updatedAt: new Date() };
      if (d.dealStatus === "won") update.wonAt = new Date();
      if (d.dealStatus === "lost") update.lostAt = new Date();
      if (target) update.leadStageId = target.id;
      await db.update(prospects).set(update).where(eq(prospects.id, existing[0].prospectId!));
    }

    res.json(u[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
