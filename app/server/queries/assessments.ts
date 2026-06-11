import { eq } from "drizzle-orm"
import { db } from "../db"
import { assessments } from "../schema"
import type { NewAssessment } from "../schema"

/**
 * Fetches all assessments for a team, ordered by creation date descending.
 * Excludes soft-deleted records.
 *
 * @param teamId - The team's numeric ID.
 * @returns An array of assessment records.
 */
export async function getAssessmentsForTeam(teamId: number) {
	return db.query.assessments.findMany({
		where: (a, { and, eq, isNull }) => and(eq(a.teamId, teamId), isNull(a.deletedAt)),
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}

/**
 * Fetches a single assessment by ID, eager-loading the team and its semester.
 * Excludes soft-deleted records.
 *
 * @param id - The assessment's numeric ID.
 * @returns The assessment with nested `team.semester`, or `undefined` if not found.
 */
export async function getAssessmentById(id: number) {
	return db.query.assessments.findFirst({
		where: (a, { and, eq, isNull }) => and(eq(a.id, id), isNull(a.deletedAt)),
		with: {
			team: { with: { semester: true } },
		},
	})
}

/**
 * Inserts a new assessment record.
 *
 * @param data - The assessment insert payload including `teamId`, `title`, `framework`, and audit columns.
 * @returns The newly created assessment record.
 */
export async function createAssessment(data: NewAssessment) {
	const [assessment] = await db.insert(assessments).values(data).returning()
	return assessment!
}

/**
 * Updates the workflow status of an assessment.
 *
 * @param id - The assessment's numeric ID.
 * @param status - The new status: `"draft"`, `"submitted"`, `"reviewed"`, or `"approved"`.
 * @param actorId - The ID of the user performing the change, used for audit columns.
 */
export async function updateAssessmentStatus(
	id: number,
	status: "draft" | "submitted" | "reviewed" | "approved",
	actorId: string,
) {
	await db
		.update(assessments)
		.set({ status, modifiedBy: actorId, modifiedDate: new Date().toISOString() })
		.where(eq(assessments.id, id))
}

/**
 * Soft-deletes an assessment by setting `deletedAt` and `deletedBy`.
 * The record is retained for audit trail integrity.
 *
 * @param id - The assessment's numeric ID.
 * @param actorId - The ID of the user performing the deletion.
 */
export async function softDeleteAssessment(id: number, actorId: string) {
	await db
		.update(assessments)
		.set({
			deletedAt: new Date().toISOString(),
			deletedBy: actorId,
			modifiedBy: actorId,
			modifiedDate: new Date().toISOString(),
		})
		.where(eq(assessments.id, id))
}
