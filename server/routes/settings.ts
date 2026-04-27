import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db";
import {
  users,
  roles,
  leadStages,
  leadStatuses,
  lostReasons,
  products,
  channels,
  activityTypes,
  customFields,
  kpiDefinitions,
  scoringRules,
  slaRules,
  auditLogs,
} from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requirePermission, type AuthedRequest } from "../middleware/auth";
import { PERMISSIONS, ALL_PERMISSIONS, type PermissionKey } from "../../shared/permissions";
import { audit } from "../lib/audit";

const router = Router();

// Generic helpers ---------------------------------------------------------

function crud<T extends Record<string, any>>(
  path: string,
  table: any,
  schema: z.ZodType<any>,
  permView: PermissionKey,
  permEdit: PermissionKey
) {
  router.get(`/${path}`, requireAuth, requirePermission(permView), async (_req, res) => {
    const rows = await db.select().from(table).orderBy(table.id);
    res.json(rows);
  });
  router.post(`/${path}`, requireAuth, requirePermission(permEdit), async (req: AuthedRequest, res) => {
    try {
      const data = schema.parse(req.body);
      const inserted = await db.insert(table).values(data).returning();
      await audit({ userId: req.user!.id, entityType: path, entityId: inserted[0].id, action: "create", newValue: inserted[0] });
      res.json(inserted[0]);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.patch(`/${path}/:id`, requireAuth, requirePermission(permEdit), async (req: AuthedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = (schema as any).partial().parse(req.body);
      const u = await db.update(table).set({ ...data, updatedAt: new Date() }).where(eq(table.id, id)).returning();
      await audit({ userId: req.user!.id, entityType: path, entityId: id, action: "update", newValue: u[0] });
      res.json(u[0]);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
  router.delete(`/${path}/:id`, requireAuth, requirePermission(permEdit), async (req: AuthedRequest, res) => {
    const id = parseInt(req.params.id);
    await db.delete(table).where(eq(table.id, id));
    await audit({ userId: req.user!.id, entityType: path, entityId: id, action: "delete" });
    res.json({ ok: true });
  });
}

// Lookups -----------------------------------------------------------------

crud(
  "lead-stages",
  leadStages,
  z.object({
    stageName: z.string().min(1),
    stageOrder: z.number().int().default(0),
    stageType: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_EDIT
);

crud(
  "lead-statuses",
  leadStatuses,
  z.object({ statusName: z.string().min(1), description: z.string().optional(), isActive: z.boolean().optional() }),
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_EDIT
);

crud(
  "lost-reasons",
  lostReasons,
  z.object({ reasonName: z.string().min(1), description: z.string().optional(), isActive: z.boolean().optional() }),
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_EDIT
);

crud(
  "products",
  products,
  z.object({
    productName: z.string().min(1),
    productCategory: z.string().optional(),
    price: z.union([z.number(), z.string()]).transform((v) => v.toString()).optional(),
    billingCycle: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_EDIT
);

crud(
  "channels",
  channels,
  z.object({ channelName: z.string().min(1), description: z.string().optional(), isActive: z.boolean().optional() }),
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_EDIT
);

crud(
  "activity-types",
  activityTypes,
  z.object({ typeName: z.string().min(1), description: z.string().optional(), isActive: z.boolean().optional() }),
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_EDIT
);

crud(
  "custom-fields",
  customFields,
  z.object({
    entityType: z.string(),
    fieldKey: z.string(),
    fieldLabel: z.string(),
    fieldType: z.string(),
    optionsJson: z.any().optional(),
    isRequired: z.boolean().optional(),
    isFilterable: z.boolean().optional(),
    isReportable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  }),
  PERMISSIONS.CUSTOM_FIELDS_MANAGE,
  PERMISSIONS.CUSTOM_FIELDS_MANAGE
);

crud(
  "kpis",
  kpiDefinitions,
  z.object({
    kpiKey: z.string(),
    kpiName: z.string(),
    description: z.string().optional(),
    formula: z.string().optional(),
    entityLevel: z.string().optional(),
    formatType: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  PERMISSIONS.KPI_MANAGE,
  PERMISSIONS.KPI_MANAGE
);

crud(
  "scoring-rules",
  scoringRules,
  z.object({
    ruleName: z.string(),
    entityType: z.string(),
    conditionJson: z.any().optional(),
    scoreValue: z.number().int(),
    isActive: z.boolean().optional(),
  }),
  PERMISSIONS.SETTINGS_EDIT,
  PERMISSIONS.SETTINGS_EDIT
);

crud(
  "sla-rules",
  slaRules,
  z.object({
    ruleName: z.string(),
    stageId: z.number().int().optional().nullable(),
    maxResponseMinutes: z.number().int().optional().nullable(),
    maxFollowupHours: z.number().int().optional().nullable(),
    priority: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  PERMISSIONS.SLA_MANAGE,
  PERMISSIONS.SLA_MANAGE
);

// Roles -------------------------------------------------------------------

router.get("/roles", requireAuth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (_req, res) => {
  const rows = await db.select().from(roles).orderBy(roles.id);
  res.json({ roles: rows, allPermissions: ALL_PERMISSIONS });
});

router.post("/roles", requireAuth, requirePermission(PERMISSIONS.USERS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const data = z
      .object({ name: z.string(), description: z.string().optional(), permissionsJson: z.array(z.string()) })
      .parse(req.body);
    const inserted = await db.insert(roles).values(data).returning();
    await audit({ userId: req.user!.id, entityType: "role", entityId: inserted[0].id, action: "create", newValue: inserted[0] });
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/roles/:id", requireAuth, requirePermission(PERMISSIONS.USERS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = z
      .object({ name: z.string().optional(), description: z.string().optional(), permissionsJson: z.array(z.string()).optional() })
      .parse(req.body);
    const u = await db.update(roles).set({ ...data, updatedAt: new Date() }).where(eq(roles.id, id)).returning();
    await audit({ userId: req.user!.id, entityType: "role", entityId: id, action: "update", newValue: u[0] });
    res.json(u[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Users -------------------------------------------------------------------

router.get("/users", requireAuth, requirePermission(PERMISSIONS.USERS_VIEW), async (_req, res) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roleId: users.roleId,
      roleName: roles.name,
      status: users.status,
      phone: users.phone,
      team: users.team,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(users.id);
  res.json(rows);
});

router.post("/users", requireAuth, requirePermission(PERMISSIONS.USERS_CREATE), async (req: AuthedRequest, res) => {
  try {
    const data = z
      .object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        roleId: z.number().int(),
        phone: z.string().optional(),
        team: z.string().optional(),
      })
      .parse(req.body);
    const hash = await bcrypt.hash(data.password, 10);
    const inserted = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: hash,
        roleId: data.roleId,
        phone: data.phone,
        team: data.team,
        status: "active",
      })
      .returning();
    await audit({ userId: req.user!.id, entityType: "user", entityId: inserted[0].id, action: "create", newValue: inserted[0] });
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/users/:id", requireAuth, requirePermission(PERMISSIONS.USERS_EDIT), async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = z
      .object({
        name: z.string().optional(),
        roleId: z.number().int().optional(),
        status: z.string().optional(),
        phone: z.string().optional(),
        team: z.string().optional(),
        password: z.string().min(6).optional(),
      })
      .parse(req.body);
    const updates: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updates.passwordHash = await bcrypt.hash(data.password, 10);
      delete updates.password;
    }
    const u = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    await audit({ userId: req.user!.id, entityType: "user", entityId: id, action: "update", newValue: u[0] });
    res.json(u[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// System config (read-only summary of lookup tables) -----------------------

router.get("/config", requireAuth, requirePermission(PERMISSIONS.SETTINGS_VIEW), async (_req, res) => {
  const [stagesRows, statusesRows, lostRows, productsRows, channelsRows, activityTypesRows, kpisRows, scoringRows, slaRows] = await Promise.all([
    db.select().from(leadStages),
    db.select().from(leadStatuses),
    db.select().from(lostReasons),
    db.select().from(products),
    db.select().from(channels),
    db.select().from(activityTypes),
    db.select().from(kpiDefinitions),
    db.select().from(scoringRules),
    db.select().from(slaRules),
  ]);
  res.json({
    currency: "EGP",
    counts: {
      leadStages: stagesRows.length,
      leadStatuses: statusesRows.length,
      lostReasons: lostRows.length,
      products: productsRows.length,
      channels: channelsRows.length,
      activityTypes: activityTypesRows.length,
      kpis: kpisRows.length,
      scoringRules: scoringRows.length,
      slaRules: slaRows.length,
    },
    kpis: kpisRows,
    scoringRules: scoringRows,
    slaRules: slaRows,
  });
});

// Audit -------------------------------------------------------------------

router.get("/audit", requireAuth, requirePermission(PERMISSIONS.AUDIT_VIEW), async (_req, res) => {
  const rows = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      action: auditLogs.action,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(500);
  res.json(rows);
});

export default router;
