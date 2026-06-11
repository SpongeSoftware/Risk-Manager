import { db } from "../db"
import { feedback } from "../schema"
import type { NewFeedback } from "../schema"

export async function getFeedbackForAssessment(assessmentId: number) {
	return db.query.feedback.findMany({
		where: (f, { and, eq, isNull }) => and(eq(f.assessmentId, assessmentId), isNull(f.deletedAt)),
		with: { supervisor: true },
		orderBy: (f, { desc }) => desc(f.createdDate),
	})
}

export async function createFeedback(data: NewFeedback) {
	const [item] = await db.insert(feedback).values(data).returning()
	return item!
}
