import { eq } from "drizzle-orm"
import { db } from "../db"
import { riskItems } from "../schema"
import type { NewRiskItem } from "../schema"

/**
 * Fetches all risk items for an assessment, ordered by risk score descending
 * so the most critical items appear first. Excludes soft-deleted records.
 *
 * @param assessmentId - The assessment's numeric ID.
 * @returns An array of risk item records.
 */
export async function getRiskItemsForAssessment(assessmentId: number) {
	return db.query.riskItems.findMany({
		where: (r, { and, eq, isNull }) => and(eq(r.assessmentId, assessmentId), isNull(r.deletedAt)),
		orderBy: (r, { desc }) => desc(r.riskScore),
	})
}

/**
 * Fetches all risk items for a set of assessments in a single query, ordered by
 * risk score descending. Excludes soft-deleted records. Used by the team report
 * loader to avoid one query per assessment.
 *
 * @param assessmentIds - The assessments' numeric IDs.
 * @returns An array of risk item records across all requested assessments.
 */
export async function getRiskItemsForAssessments(assessmentIds: number[]) {
	if (assessmentIds.length === 0) return []
	return db.query.riskItems.findMany({
		where: (r, { and, inArray, isNull }) =>
			and(inArray(r.assessmentId, assessmentIds), isNull(r.deletedAt)),
		orderBy: (r, { desc }) => desc(r.riskScore),
	})
}

/**
 * Fetches a single risk item by ID. Excludes soft-deleted records.
 *
 * @param id - The risk item's numeric ID.
 * @returns The risk item record, or `undefined` if not found.
 */
export async function getRiskItemById(id: number) {
	return db.query.riskItems.findFirst({
		where: (r, { and, eq, isNull }) => and(eq(r.id, id), isNull(r.deletedAt)),
	})
}

/**
 * Inserts a new risk item, automatically computing `riskScore = likelihood × impact`.
 * The `riskScore` column is stored (not virtual) to allow efficient sorting.
 *
 * @param data - Risk item payload without `riskScore`; `likelihood` and `impact` are required.
 * @returns The newly created risk item record including the computed `riskScore`.
 */
export async function createRiskItem(data: Omit<NewRiskItem, "riskScore"> & { likelihood: number; impact: number }) {
	const riskScore = data.likelihood * data.impact
	const [item] = await db.insert(riskItems).values({ ...data, riskScore }).returning()
	return item
}

/**
 * Updates a risk item's fields. Automatically recomputes `riskScore = likelihood × impact`
 * when both `likelihood` and `impact` are present in the update payload.
 *
 * @param id - The risk item's numeric ID.
 * @param data - Partial update payload (any fields except `id` and `assessmentId`).
 * @param actorId - The ID of the user performing the change, used for audit columns.
 */
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

/**
 * Soft-deletes a risk item by setting `deletedAt` and `deletedBy`.
 * The record is retained for audit trail integrity.
 *
 * @param id - The risk item's numeric ID.
 * @param actorId - The ID of the user performing the deletion.
 */
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
