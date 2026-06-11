import { db } from "../db"
import { feedback } from "../schema"
import type { NewFeedback } from "../schema"

/**
 * Fetches all feedback for an assessment, including the supervisor's user record,
 * ordered by creation date descending. Excludes soft-deleted records.
 *
 * @param assessmentId - The assessment's numeric ID.
 * @returns An array of feedback records each including the linked supervisor user.
 */
export async function getFeedbackForAssessment(assessmentId: number) {
	return db.query.feedback.findMany({
		where: (f, { and, eq, isNull }) => and(eq(f.assessmentId, assessmentId), isNull(f.deletedAt)),
		with: { supervisor: true },
		orderBy: (f, { desc }) => desc(f.createdDate),
	})
}

/**
 * Inserts a new feedback comment on an assessment.
 *
 * @param data - The feedback insert payload including `assessmentId`, `supervisorId`, `comment`, and audit columns.
 * @returns The newly created feedback record.
 */
export async function createFeedback(data: NewFeedback) {
	const [item] = await db.insert(feedback).values(data).returning()
	return item!
}
