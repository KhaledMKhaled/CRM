import { db } from "../db";
import { auditLogs } from "../../shared/schema";

export async function audit(opts: {
  userId?: number | null;
  entityType: string;
  entityId?: number | null;
  action: string;
  oldValue?: any;
  newValue?: any;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: opts.userId ?? null,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      action: opts.action,
      oldValueJson: opts.oldValue ?? null,
      newValueJson: opts.newValue ?? null,
    });
  } catch (e) {
    console.error("audit log failure", e);
  }
}
