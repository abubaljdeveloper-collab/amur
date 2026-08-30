import { prisma } from "@instagram-agent/db";
import type { ActorType } from "@instagram-agent/db";

export interface AuditEntry {
  actorType: ActorType;
  actorId?: string;
  instagramAccountId?: string;
  entityType: string;
  entityId: string;
  eventType: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: unknown;
}

/** Called unconditionally at every Decision Engine step outcome — including blocked/failed/pending. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorType: entry.actorType,
      actorId: entry.actorId,
      instagramAccountId: entry.instagramAccountId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      eventType: entry.eventType,
      beforeState: entry.beforeState as never,
      afterState: entry.afterState as never,
      metadata: entry.metadata as never,
    },
  });
}
