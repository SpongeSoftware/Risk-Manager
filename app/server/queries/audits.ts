import { db } from "../db"
import { audits } from "../schema"
import type { Audit } from "../schema"

type EntityType = typeof audits.$inferSelect["entityType"]
type Action = typeof audits.$inferSelect["action"]

/**
 * Appends an immutable audit entry for an entity change.
 * Audit rows are never updated or deleted — they form an append-only trail.
 *
 * @param entityType - The type of entity being audited (e.g. `"assessment"`, `"risk_item"`).
 * @param entityId - The numeric or string ID of the affected entity.
 * @param action - The type of change: `"created"`, `"updated"`, or `"deleted"`.
 * @param actorId - The internal UUID of the user who made the change.
 * @param opts - Optional field-level change details.
 * @param opts.fieldChanged - The name of the field that was modified.
 * @param opts.oldValue - The previous value as a string.
 * @param opts.newValue - The new value as a string.
 */
export async function appendAudit(
	entityType: EntityType,
	entityId: string | number,
	action: Action,
	actorId: string,
	opts?: { fieldChanged?: string; oldValue?: string; newValue?: string },
) {
	await db.insert(audits).values({
		entityType,
		entityId: String(entityId),
		action,
		fieldChanged: opts?.fieldChanged,
		oldValue: opts?.oldValue,
		newValue: opts?.newValue,
		createdBy: actorId,
	})
}

/**
 * Fetches the full audit history for a specific entity, ordered newest first.
 *
 * @param entityType - The type of entity to retrieve history for.
 * @param entityId - The numeric or string ID of the entity.
 * @returns An array of audit records in descending chronological order.
 */
export async function getAuditTrail(entityType: EntityType, entityId: string | number): Promise<Audit[]> {
	return db.query.audits.findMany({
		where: (a, { and, eq }) =>
			and(eq(a.entityType, entityType), eq(a.entityId, String(entityId))),
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}

/**
 * Fetches assessment-related audit entries. Currently returns all assessment
 * audits regardless of team — team-scoped filtering is not yet implemented.
 *
 * @param _teamId - Reserved for future team-scoped filtering (currently unused).
 * @returns An array of assessment audit records ordered newest first.
 */
export async function getAuditsForTeam(_teamId: number): Promise<Audit[]> {
	return db.query.audits.findMany({
		where: (a, { eq }) => eq(a.entityType, "assessment"),
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}

/**
 * Fetches the complete system-wide audit log, ordered newest first.
 * Used by the Admin audits page.
 *
 * @returns An array of all audit records.
 */
export async function getAllAudits(): Promise<Audit[]> {
	return db.query.audits.findMany({
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}
