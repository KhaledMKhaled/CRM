import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, roles } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { audit } from "../lib/audit";
import type { AuthedRequest } from "../middleware/auth";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        roleId: users.roleId,
        status: users.status,
        roleName: roles.name,
        permissionsJson: roles.permissionsJson,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    const u = rows[0];
    if (!u || u.status !== "active") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(body.password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    req.session.userId = u.id;
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
    await audit({ userId: u.id, entityType: "user", entityId: u.id, action: "login" });

    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      roleId: u.roleId,
      roleName: u.roleName,
      permissions: u.permissionsJson,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "unauthenticated" });
  res.json(req.user);
});

export default router;
