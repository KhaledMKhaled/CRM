import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { activities, prospects, users } from "../../shared/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { audit } from "../lib/audit";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED), async (req: AuthedRequest, res) => {
  const prospectId = req.query.prospectId ? parseInt(req.query.prospectId as string) : undefined;
  const conds: any[] = [];
  if (prospectId) conds.push(eq(activities.prospectId, prospectId));
  // Server-side scope: users without LEADS_VIEW_ALL only see activities they
  // performed or that belong to a prospect assigned to them.
  const canViewAll = req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL);
  if (!canViewAll) {
    conds.push(
      or(
        eq(activities.userId, req.user!.id),
        eq(prospects.assignedSalesId, req.user!.id)
      )!
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select({
      id: activities.id,
      prospectId: activities.prospectId,
      prospectName: prospects.fullName,
      userId: activities.userId,
      userName: users.name,
      activityDate: activities.activityDate,
      activityType: activities.activityType,
      activityChannel: activities.activityChannel,
      activityOutcome: activities.activityOutcome,
      notes: activities.notes,
      nextFollowupDate: activities.nextFollowupDate,
      durationMinutes: activities.durationMinutes,
    })
    .from(activities)
    .leftJoin(prospects, eq(activities.prospectId, prospects.id))
    .leftJoin(users, eq(activities.userId, users.id))
    .where(where)
    .orderBy(desc(activities.activityDate))
    .limit(500);
  res.json(rows);
});

const actSchema = z.object({
  prospectId: z.number().int(),
  activityType: z.string(),
  activityChannel: z.string().optional(),
  activityOutcome: z.string().optional(),
  notes: z.string().optional(),
  nextFollowupDate: z.string().optional().nullable(),
  durationMinutes: z.number().int().optional().nullable(),
  activityDate: z.string().optional(),
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.LEADS_EDIT, PERMISSIONS.LEADS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const a = actSchema.parse(req.body);
    // Object-level authorization: non-privileged users may only log activities
    // for prospects assigned to them.
    const canViewAll = req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL);
    if (!canViewAll) {
      const p = await db
        .select({ assignedSalesId: prospects.assignedSalesId })
        .from(prospects)
        .where(eq(prospects.id, a.prospectId))
        .limit(1);
      if (!p[0]) return res.status(404).json({ error: "prospect not found" });
      if (p[0].assignedSalesId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
    }
    const inserted = await db
      .insert(activities)
      .values({
        prospectId: a.prospectId,
        userId: req.user!.id,
        activityDate: a.activityDate ? new Date(a.activityDate) : new Date(),
        activityType: a.activityType,
        activityChannel: a.activityChannel,
        activityOutcome: a.activityOutcome,
        notes: a.notes,
        nextFollowupDate: a.nextFollowupDate ? new Date(a.nextFollowupDate) : null,
        durationMinutes: a.durationMinutes,
      })
      .returning();

    // Update prospect lastActivityAt + nextFollowupAt + firstReplyAt
    const p = await db.select().from(prospects).where(eq(prospects.id, a.prospectId)).limit(1);
    if (p[0]) {
      const updates: any = { lastActivityAt: new Date(), updatedAt: new Date() };
      if (a.nextFollowupDate) updates.nextFollowupAt = new Date(a.nextFollowupDate);
      if (!p[0].firstReplyAt) updates.firstReplyAt = new Date();
      await db.update(prospects).set(updates).where(eq(prospects.id, a.prospectId));
    }

    await audit({ userId: req.user!.id, entityType: "activity", entityId: inserted[0].id, action: "create", newValue: inserted[0] });
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
