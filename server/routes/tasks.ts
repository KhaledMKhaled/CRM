import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { tasks, prospects, users } from "../../shared/schema";
import { eq, desc, and, lte, asc, or } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS } from "../../shared/permissions";
import { audit } from "../lib/audit";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.LEADS_VIEW_ALL, PERMISSIONS.LEADS_VIEW_ASSIGNED), async (req: AuthedRequest, res) => {
  const mine = req.query.mine === "true";
  const status = req.query.status as string | undefined;
  const where: any[] = [];
  // Server-side scope: users without LEADS_VIEW_ALL only see tasks they own
  // (assigned to them, created by them, or attached to a prospect assigned to them).
  const canViewAll = req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL);
  if (!canViewAll) {
    where.push(
      or(
        eq(tasks.assignedTo, req.user!.id),
        eq(tasks.createdBy, req.user!.id),
        eq(prospects.assignedSalesId, req.user!.id)
      )!
    );
  }
  if (mine) where.push(eq(tasks.assignedTo, req.user!.id));
  if (status) where.push(eq(tasks.status, status));
  const rows = await db
    .select({
      id: tasks.id,
      prospectId: tasks.prospectId,
      prospectName: prospects.fullName,
      assignedTo: tasks.assignedTo,
      assignedToName: users.name,
      taskTitle: tasks.taskTitle,
      taskDescription: tasks.taskDescription,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      status: tasks.status,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(prospects, eq(tasks.prospectId, prospects.id))
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(tasks.dueDate))
    .limit(500);
  res.json(rows);
});

const taskSchema = z.object({
  prospectId: z.number().int().optional().nullable(),
  assignedTo: z.number().int(),
  taskTitle: z.string().min(1),
  taskDescription: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  status: z.string().optional(),
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.LEADS_EDIT, PERMISSIONS.LEADS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const t = taskSchema.parse(req.body);
    // Object-level authorization: non-privileged users may only create tasks
    // for prospects assigned to them.
    const canViewAll = req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL);
    if (!canViewAll && t.prospectId) {
      const p = await db
        .select({ assignedSalesId: prospects.assignedSalesId })
        .from(prospects)
        .where(eq(prospects.id, t.prospectId))
        .limit(1);
      if (!p[0]) return res.status(404).json({ error: "prospect not found" });
      if (p[0].assignedSalesId !== req.user!.id) return res.status(403).json({ error: "forbidden" });
    }
    const inserted = await db
      .insert(tasks)
      .values({
        prospectId: t.prospectId,
        assignedTo: t.assignedTo,
        createdBy: req.user!.id,
        taskTitle: t.taskTitle,
        taskDescription: t.taskDescription,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        priority: t.priority ?? "normal",
        status: t.status ?? "Pending",
      })
      .returning();
    await audit({ userId: req.user!.id, entityType: "task", entityId: inserted[0].id, action: "create", newValue: inserted[0] });
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/:id", requireAuth, requirePermission(PERMISSIONS.LEADS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db
      .select({
        id: tasks.id,
        assignedTo: tasks.assignedTo,
        createdBy: tasks.createdBy,
        prospectAssignedSalesId: prospects.assignedSalesId,
      })
      .from(tasks)
      .leftJoin(prospects, eq(tasks.prospectId, prospects.id))
      .where(eq(tasks.id, id))
      .limit(1);
    if (!existing[0]) return res.status(404).json({ error: "task not found" });
    const canViewAll = req.user!.permissions.includes(PERMISSIONS.LEADS_VIEW_ALL);
    const owns =
      existing[0].assignedTo === req.user!.id ||
      existing[0].createdBy === req.user!.id ||
      existing[0].prospectAssignedSalesId === req.user!.id;
    if (!canViewAll && !owns) return res.status(403).json({ error: "forbidden" });

    const t = taskSchema.partial().parse(req.body);
    const updates: any = { ...t, updatedAt: new Date() };
    if (t.dueDate) updates.dueDate = new Date(t.dueDate);
    if (t.status === "Completed") updates.completedAt = new Date();
    const u = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    await audit({ userId: req.user!.id, entityType: "task", entityId: id, action: "update", newValue: u[0] });
    res.json(u[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
