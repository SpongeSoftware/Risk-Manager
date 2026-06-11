import { eq } from "drizzle-orm"
import { db } from "../db"
import { semesters } from "../schema"
import type { NewSemester } from "../schema"

export async function getAllSemesters() {
	return db.query.semesters.findMany({
		where: (s, { isNull }) => isNull(s.deletedAt),
		orderBy: (s, { desc }) => [desc(s.year), desc(s.period)],
	})
}

export async function getActiveSemesters() {
	return db.query.semesters.findMany({
		where: (s, { and, isNull, eq }) => and(isNull(s.deletedAt), eq(s.isActive, true)),
	})
}

export async function getSemesterById(id: number) {
	return db.query.semesters.findFirst({
		where: (s, { and, eq, isNull }) => and(eq(s.id, id), isNull(s.deletedAt)),
	})
}

export async function createSemester(data: NewSemester) {
	const [semester] = await db.insert(semesters).values(data).returning()
	return semester!
}

export async function updateSemesterActive(id: number, isActive: boolean, actorId: string) {
	await db
		.update(semesters)
		.set({ isActive, modifiedBy: actorId, modifiedDate: new Date().toISOString() })
		.where(eq(semesters.id, id))
}

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
