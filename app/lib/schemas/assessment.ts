import { z } from "zod/v4"

/** Validation schema for the "New Assessment" form (`/teams/:teamId/assessments/new`). */
export const createAssessmentSchema = z.object({
	title: z.string().min(2, "Title must be at least 2 characters"),
	framework: z.enum(["ISO27001", "SOC2", "BOTH"]),
})

/** Validation schema for the "Update Status" form action on assessment detail pages. */
export const updateAssessmentStatusSchema = z.object({
	status: z.enum(["draft", "submitted", "reviewed", "approved"]),
})

/** Validation schema for the "Add Feedback" form on assessment detail pages (Supervisor/Admin only). */
export const addFeedbackSchema = z.object({
	comment: z.string().min(10, "Feedback must be at least 10 characters"),
})

/** Inferred TypeScript type for the create assessment form payload. */
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>
/** Inferred TypeScript type for the update assessment status form payload. */
export type UpdateAssessmentStatusInput = z.infer<typeof updateAssessmentStatusSchema>
/** Inferred TypeScript type for the add feedback form payload. */
export type AddFeedbackInput = z.infer<typeof addFeedbackSchema>
