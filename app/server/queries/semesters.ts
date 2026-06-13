import { eq } from "drizzle-orm"
import { db } from "../db"
import { semesters } from "../schema"
import type { NewSemester } from "../schema"

/**
 * Fetches all semesters ordered by year and period descending.
 * Excludes soft-deleted records.
 *
 * @returns An array of semester records.
 */
export async function getAllSemesters() {
	return db.query.semesters.findMany({
		where: (s, { isNull }) => isNull(s.deletedAt),
		orderBy: (s, { desc }) => [desc(s.year), desc(s.period)],
	})
}

/**
 * Fetches only semesters currently marked as active.
 * Excludes soft-deleted records.
 *
 * @returns An array of active semester records.
 */
export async function getActiveSemesters() {
	return db.query.semesters.findMany({
		where: (s, { and, isNull, eq }) => and(isNull(s.deletedAt), eq(s.isActive, true)),
	})
}

/**
 * Fetches a single semester by its numeric ID.
 * Excludes soft-deleted records.
 *
 * @param id - The semester's numeric ID.
 * @returns The semester record, or `undefined` if not found.
 */
export async function getSemesterById(id: number) {
	return db.query.semesters.findFirst({
		where: (s, { and, eq, isNull }) => and(eq(s.id, id), isNull(s.deletedAt)),
	})
}

/**
 * Inserts a new semester record.
 *
 * @param data - The semester insert payload including `name`, `year`, `period`, dates, and audit columns.
 * @returns The newly created semester record.
 */
export async function createSemester(data: NewSemester) {
	const [semester] = await db.insert(semesters).values(data).returning()
	return semester
}

/**
 * Updates the active state of a semester.
 * Deactivating a semester makes all child team assessments read-only and
 * prevents students on those teams from signing in.
 *
 * @param id - The semester's numeric ID.
 * @param isActive - `true` to activate; `false` to deactivate.
 * @param actorId - The ID of the Admin performing the change.
 */
export async function updateSemesterActive(id: number, isActive: boolean, actorId: string) {
	await db
		.update(semesters)
		.set({ isActive, modifiedBy: actorId, modifiedDate: new Date().toISOString() })
		.where(eq(semesters.id, id))
}

/**
 * Soft-deletes a semester by setting `deletedAt` and `deletedBy`.
 * The record is retained for audit trail integrity.
 *
 * @param id - The semester's numeric ID.
 * @param actorId - The ID of the Admin performing the deletion.
 */
export async function softDeleteSemester(id: number, actorId: string) {
	await db
		.update(semesters)
		.set({
			deletedAt: new Date().toISOString(),
			deletedBy: actorId,
			modifiedBy: actorId,
			modifiedDate: new Date().toISOString(),
		})
		.where(eq(semesters.id, id))
}
