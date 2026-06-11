import { eq } from "drizzle-orm"
import { db } from "../db"
import { assessments } from "../schema"
import type { NewAssessment } from "../schema"

export async function getAssessmentsForTeam(teamId: number) {
	return db.query.assessments.findMany({
		where: (a, { and, eq, isNull }) => and(eq(a.teamId, teamId), isNull(a.deletedAt)),
		orderBy: (a, { desc }) => desc(a.createdDate),
	})
}

export async function getAssessmentById(id: number) {
	return db.query.assessments.findFirst({
		where: (a, { and, eq, isNull }) => and(eq(a.id, id), isNull(a.deletedAt)),
		with: {
			team: { with: { semester: true } },
		},
	})
}

export async function createAssessment(data: NewAssessment) {
	const [assessment] = await db.insert(assessments).values(data).returning()
	return assessment!
}

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
