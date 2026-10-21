import type { Prisma } from "@prisma/client";

type AuditContext =
  | { source: "SELF_SERVICE" | "SCHOOL_OWNER"; actorId: string; label?: never }
  | { source: "SEED" | "LEGACY_MIGRATION"; actorId?: never; label: string };

export async function setPasswordAuditContext(tx: Prisma.TransactionClient, context: AuditContext) {
  await tx.$queryRaw`
    SELECT set_config('app.password_audit_source', ${context.source}, true),
           set_config('app.password_audit_actor_id', ${context.actorId ?? ""}, true),
           set_config('app.password_audit_actor_label', ${context.label ?? ""}, true)
  `;
}
