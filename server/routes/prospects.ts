import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { prospects, leadStages, leadStatuses, lostReasons, products, users, activities, deals, customFields, customFieldValues } from "../../shared/schema";
import { eq, and, ilike, or, desc, asc, sql, gte, lte, inArray } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { audit } from "../lib/audit";
import { attributeProspect } from "../lib/attribution";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED), async (req: AuthedRequest, res) => {
  const q = req.query.q as string | undefined;
  const stageId = req.query.stageId ? parseInt(req.query.stageId as string) : undefined;
  const assignedSalesId = req.query.assignedSalesId ? parseInt(req.query.assignedSalesId as string) : undefined;
  const channel = req.query.channel as string | undefined;
  const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
  const offset = parseInt((req.query.offset as string) || "0");

  const where: any[] = [];

  // Sales role: only own
  if (
    !req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL) &&
    req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ASSIGNED)
  ) {
    where.push(eq(prospects.assignedSalesId, req.user!.id));
  }

  if (q) {
    where.push(
      or(
        ilike(prospects.fullName, `%${q}%`),
        ilike(prospects.phone, `%${q}%`),
        ilike(prospects.email, `%${q}%`),
        ilike(prospects.companyName, `%${q}%`),
        ilike(prospects.prospectCode, `%${q}%`)
      )!
    );
  }
  if (stageId) where.push(eq(prospects.leadStageId, stageId));
  if (assignedSalesId) where.push(eq(prospects.assignedSalesId, assignedSalesId));
  if (channel) where.push(eq(prospects.channel, channel));
  if (campaignId) where.push(eq(prospects.campaignId, campaignId));

  const filterWhere = where.length ? and(...where) : undefined;

  const rows = await db
    .select({
      id: prospects.id,
      prospectCode: prospects.prospectCode,
      fullName: prospects.fullName,
      phone: prospects.phone,
      email: prospects.email,
      companyName: prospects.companyName,
      channel: prospects.channel,
      source: prospects.source,
      campaignId: prospects.campaignId,
      campaignNameSnapshot: prospects.campaignNameSnapshot,
      isAttributed: prospects.isAttributed,
      assignedSalesId: prospects.assignedSalesId,
      assignedSalesName: users.name,
      leadStageId: prospects.leadStageId,
      stageName: leadStages.stageName,
      leadStatusId: prospects.leadStatusId,
      statusName: leadStatuses.statusName,
      leadQuality: prospects.leadQuality,
      leadScore: prospects.leadScore,
      createdDate: prospects.createdDate,
      lastActivityAt: prospects.lastActivityAt,
      nextFollowupAt: prospects.nextFollowupAt,
      mqlAt: prospects.mqlAt,
      sqlAt: prospects.sqlAt,
      wonAt: prospects.wonAt,
      lostAt: prospects.lostAt,
    })
    .from(prospects)
    .leftJoin(users, eq(prospects.assignedSalesId, users.id))
    .leftJoin(leadStages, eq(prospects.leadStageId, leadStages.id))
    .leftJoin(leadStatuses, eq(prospects.leadStatusId, leadStatuses.id))
    .where(filterWhere)
    .orderBy(desc(prospects.createdDate))
    .limit(limit)
    .offset(offset);

  const totalRow = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(prospects)
    .where(filterWhere);
  const total = parseInt(totalRow[0]?.n ?? "0");

  res.json({ rows, total, limit, offset });
});

router.get("/:id", requireAuth, requirePermission(PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED), async (req: AuthedRequest, res) => {
  const id = parseInt(req.params.id);
  const rows = await db.select().from(prospects).where(eq(prospects.id, id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "not found" });
  // Sales: only own
  if (
    !req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL) &&
    rows[0].assignedSalesId !== req.user!.id
  ) {
    return res.status(403).json({ error: "forbidden" });
  }
  const acts = await db
    .select()
    .from(activities)
    .where(eq(activities.prospectId, id))
    .orderBy(desc(activities.activityDate));
  const dls = await db.select().from(deals).where(eq(deals.prospectId, id));
  res.json({ ...rows[0], activities: acts, deals: dls });
});

const prospectInputSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  channel: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  campaignNameSnapshot: z.string().optional(),
  adsetNameSnapshot: z.string().optional(),
  adNameSnapshot: z.string().optional(),
  assignedSalesId: z.number().int().optional().nullable(),
  leadStageId: z.number().int().optional().nullable(),
  leadStatusId: z.number().int().optional().nullable(),
  leadQuality: z.string().optional(),
  productId: z.number().int().optional().nullable(),
  productInterest: z.string().optional(),
  notes: z.string().optional(),
});

async function nextProspectCode(): Promise<string> {
  const r = await db.execute(sql`SELECT COALESCE(MAX(id), 0)::int AS n FROM prospects`);
  // @ts-ignore
  const n = parseInt(r.rows?.[0]?.n ?? 0) + 1;
  return `P-${String(n).padStart(6, "0")}`;
}

router.post("/", requireAuth, requirePermission(PERMISSIONS.LEADS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const data = prospectInputSchema.parse(req.body);
    const att = await attributeProspect({
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      utmTerm: data.utmTerm,
      campaignNameSnapshot: data.campaignNameSnapshot,
      adsetNameSnapshot: data.adsetNameSnapshot,
      adNameSnapshot: data.adNameSnapshot,
      channel: data.channel,
      source: data.source,
    });

    const code = await nextProspectCode();
    const fullName = data.fullName || [data.firstName, data.lastName].filter(Boolean).join(" ") || "Unknown";

    const inserted = await db
      .insert(prospects)
      .values({
        prospectCode: code,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName,
        phone: data.phone,
        email: data.email || null,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        industry: data.industry,
        city: data.city,
        country: data.country,
        channel: att.channel,
        source: data.source,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmContent: data.utmContent,
        utmTerm: data.utmTerm,
        campaignId: att.campaignId,
        adsetId: att.adsetId,
        adId: att.adId,
        campaignNameSnapshot: att.campaignNameSnapshot,
        adsetNameSnapshot: att.adsetNameSnapshot,
        adNameSnapshot: att.adNameSnapshot,
        isAttributed: att.isAttributed,
        assignedSalesId: data.assignedSalesId ?? req.user!.id,
        leadStageId: data.leadStageId,
        leadStatusId: data.leadStatusId,
        leadQuality: data.leadQuality,
        productId: data.productId,
        productInterest: data.productInterest,
        notes: data.notes,
        firstContactDate: new Date(),
      })
      .returning();

    await audit({
      userId: req.user!.id,
      entityType: "prospect",
      entityId: inserted[0].id,
      action: "create",
      newValue: inserted[0],
    });

    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id", requireAuth, requirePermission(PERMISSIONS.LEADS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(prospects).where(eq(prospects.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "not found" });

    if (
      !req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL) &&
      existing[0].assignedSalesId !== req.user!.id
    ) {
      return res.status(403).json({ error: "forbidden" });
    }

    const data = prospectInputSchema.partial().parse(req.body);
    const updates: any = { ...data, updatedAt: new Date() };
    if (data.email === "") updates.email = null;

    // Stage transitions → set timestamps + log a stage-change activity automatically
    let prevStageName: string | null = null;
    let nextStageName: string | null = null;
    if (data.leadStageId && data.leadStageId !== existing[0].leadStageId) {
      const stage = await db.select().from(leadStages).where(eq(leadStages.id, data.leadStageId)).limit(1);
      const stageType = stage[0]?.stageType;
      const stageName = stage[0]?.stageName?.toLowerCase() ?? "";
      nextStageName = stage[0]?.stageName ?? null;
      if (existing[0].leadStageId) {
        const prev = await db
          .select({ stageName: leadStages.stageName })
          .from(leadStages)
          .where(eq(leadStages.id, existing[0].leadStageId))
          .limit(1);
        prevStageName = prev[0]?.stageName ?? null;
      }
      if (stageType === "won" || stageName.includes("won")) {
        updates.wonAt = updates.wonAt || new Date();
      }
      if (stageType === "lost" || stageName.includes("lost")) {
        updates.lostAt = updates.lostAt || new Date();
      }
      if (stageName.includes("mql") && !existing[0].mqlAt) updates.mqlAt = new Date();
      if (stageName.includes("sql") && !existing[0].sqlAt) updates.sqlAt = new Date();
    }

    const updated = await db.update(prospects).set(updates).where(eq(prospects.id, id)).returning();

    // Stage-change activity (after the update so the timestamp lines up)
    if (nextStageName) {
      await db.insert(activities).values({
        prospectId: id,
        userId: req.user!.id,
        activityType: "stage_change",
        notes: prevStageName
          ? `Stage changed: ${prevStageName} → ${nextStageName}`
          : `Stage set to ${nextStageName}`,
        metaJson: { from: prevStageName, to: nextStageName, fromStageId: existing[0].leadStageId, toStageId: data.leadStageId },
      });
      await db
        .update(prospects)
        .set({ lastActivityAt: new Date(), updatedAt: new Date() })
        .where(eq(prospects.id, id));
    }

    await audit({
      userId: req.user!.id,
      entityType: "prospect",
      entityId: id,
      action: "update",
      oldValue: existing[0],
      newValue: updated[0],
    });
    res.json(updated[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.LEADS_DELETE), async (req: AuthedRequest, res) => {
  const id = parseInt(req.params.id);
  await db.delete(prospects).where(eq(prospects.id, id));
  await audit({ userId: req.user!.id, entityType: "prospect", entityId: id, action: "delete" });
  res.json({ ok: true });
});

// ── Custom field values for a prospect ──────────────────────────────────────

// GET /api/prospects/:id/custom-fields
// Returns all active custom fields for entity=prospect, with their saved value (if any)
router.get("/:id/custom-fields", requireAuth, requirePermission(PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED), async (req: AuthedRequest, res) => {
  const entityId = parseInt(req.params.id);
  const fields = await db
    .select()
    .from(customFields)
    .where(and(eq(customFields.entityType, "prospect"), eq(customFields.isActive, true)))
    .orderBy(customFields.displayOrder, customFields.id);

  const values = await db
    .select()
    .from(customFieldValues)
    .where(and(eq(customFieldValues.entityType, "prospect"), eq(customFieldValues.entityId, entityId)));

  const valueMap = new Map(values.map((v) => [v.customFieldId, v]));

  const result = fields.map((f) => ({
    ...f,
    value: valueMap.get(f.id) ?? null,
  }));

  res.json(result);
});

// PUT /api/prospects/:id/custom-fields
// Body: { values: { fieldId: number; valueText?: string; valueNumber?: string; valueDate?: string; valueJson?: any }[] }
router.put("/:id/custom-fields", requireAuth, requirePermission(PERMISSIONS.LEADS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const entityId = parseInt(req.params.id);
    const { values: incoming } = z.object({
      values: z.array(z.object({
        fieldId: z.number().int(),
        valueText: z.string().optional().nullable(),
        valueNumber: z.union([z.string(), z.number()]).transform(String).optional().nullable(),
        valueDate: z.string().optional().nullable(),
        valueJson: z.any().optional().nullable(),
      })),
    }).parse(req.body);

    for (const v of incoming) {
      const existing = await db
        .select()
        .from(customFieldValues)
        .where(and(eq(customFieldValues.customFieldId, v.fieldId), eq(customFieldValues.entityType, "prospect"), eq(customFieldValues.entityId, entityId)))
        .limit(1);

      const payload: any = {
        customFieldId: v.fieldId,
        entityType: "prospect",
        entityId,
        valueText: v.valueText ?? null,
        valueNumber: v.valueNumber ?? null,
        valueDate: v.valueDate ? new Date(v.valueDate) : null,
        valueJson: v.valueJson ?? null,
        updatedAt: new Date(),
      };

      if (existing[0]) {
        await db.update(customFieldValues).set(payload).where(eq(customFieldValues.id, existing[0].id));
      } else {
        await db.insert(customFieldValues).values(payload);
      }
    }

    await audit({ userId: req.user!.id, entityType: "prospect", entityId, action: "update_custom_fields", newValue: incoming });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post(
  "/bulk-assign",
  requireAuth,
  requirePermission(PERMISSIONS.LEADS_ASSIGN),
  async (req: AuthedRequest, res) => {
    try {
      const data = z.object({ ids: z.array(z.number().int()), assignedSalesId: z.number().int() }).parse(req.body);
      await db
        .update(prospects)
        .set({ assignedSalesId: data.assignedSalesId, updatedAt: new Date() })
        .where(inArray(prospects.id, data.ids));
      await audit({
        userId: req.user!.id,
        entityType: "prospect",
        action: "bulk_assign",
        newValue: data,
      });
      res.json({ ok: true, count: data.ids.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
);

export default router;
