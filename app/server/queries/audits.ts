import { db } from "../db"
import { audits } from "../schema"
import type { Audit } from "../schema"

type EntityType = typeof audits.$inferSelect["entityType"]
type Action = typeof audits.$inferSelect["action"]

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

export async function getAuditTrail(entityType: EntityType, entityId: string | number): Promise<Audit[]> {
	return db.query.audits.findMany({
		where: (a, { and, eq }) =>
			and(eq(a.entityType, entityType), eq(a.entityId, String(entityId))),
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}

export async function getAuditsForTeam(_teamId: number): Promise<Audit[]> {
	return db.query.audits.findMany({
		where: (a, { eq }) => eq(a.entityType, "assessment"),
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}

export async function getAllAudits(): Promise<Audit[]> {
	return db.query.audits.findMany({
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}
