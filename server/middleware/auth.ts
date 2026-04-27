import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, roles } from "../../shared/schema";
import { eq } from "drizzle-orm";
import type { PermissionKey } from "../../shared/permissions";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export interface AuthedRequest extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    roleId: number | null;
    roleName: string | null;
    permissions: PermissionKey[];
  };
}

export async function loadUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.session?.userId) return next();
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        roleName: roles.name,
        permissionsJson: roles.permissionsJson,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, req.session.userId))
      .limit(1);
    if (rows[0]) {
      req.user = {
        id: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
        roleId: rows[0].roleId,
        roleName: rows[0].roleName ?? null,
        permissions: (rows[0].permissionsJson as PermissionKey[]) ?? [],
      };
    }
  } catch (e) {
    console.error("loadUser error", e);
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "unauthenticated" });
  next();
}

export function requirePermission(...keys: PermissionKey[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "unauthenticated" });
    const has = keys.some((k) => req.user!.permissions.includes(k));
    if (!has) return res.status(403).json({ error: "forbidden", required: keys });
    next();
  };
}
