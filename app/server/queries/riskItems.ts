import { eq } from "drizzle-orm"
import { db } from "../db"
import { riskItems } from "../schema"
import type { NewRiskItem } from "../schema"

export async function getRiskItemsForAssessment(assessmentId: number) {
	return db.query.riskItems.findMany({
		where: (r, { and, eq, isNull }) => and(eq(r.assessmentId, assessmentId), isNull(r.deletedAt)),
		orderBy: (r, { desc }) => desc(r.riskScore),
	})
}

export async function getRiskItemById(id: number) {
	return db.query.riskItems.findFirst({
		where: (r, { and, eq, isNull }) => and(eq(r.id, id), isNull(r.deletedAt)),
	})
}

export async function createRiskItem(data: Omit<NewRiskItem, "riskScore"> & { likelihood: number; impact: number }) {
	const riskScore = data.likelihood * data.impact
	const [item] = await db.insert(riskItems).values({ ...data, riskScore }).returning()
	return item!
}

export async function updateRiskItem(
	id: number,
	data: Partial<Omit<NewRiskItem, "id" | "assessmentId">>,
	actorId: string,
) {
	const updates: typeof data & { riskScore?: number; modifiedBy: string; modifiedDate: string } = {
		...data,
		modifiedBy: actorId,
		modifiedDate: new Date().toISOString(),
	}
	if (data.likelihood !== undefined && data.impact !== undefined) {
		updates.riskScore = data.likelihood * data.impact
	}
	await db.update(riskItems).set(updates).where(eq(riskItems.id, id))
}

export async function softDeleteRiskItem(id: number, actorId: string) {
	await db
		.update(riskItems)
		.set({
			deletedAt: new Date().toISOString(),
			deletedBy: actorId,
			modifiedBy: actorId,
			modifiedDate: new Date().toISOString(),
		})
		.where(eq(riskItems.id, id))
}
