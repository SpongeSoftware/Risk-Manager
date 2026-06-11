import { z } from "zod/v4"

export const createAssessmentSchema = z.object({
	title: z.string().min(2, "Title must be at least 2 characters"),
	framework: z.enum(["ISO27001", "SOC2", "BOTH"]),
})

export const updateAssessmentStatusSchema = z.object({
	status: z.enum(["draft", "submitted", "reviewed", "approved"]),
})

export const addFeedbackSchema = z.object({
	comment: z.string().min(10, "Feedback must be at least 10 characters"),
})

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>
export type UpdateAssessmentStatusInput = z.infer<typeof updateAssessmentStatusSchema>
export type AddFeedbackInput = z.infer<typeof addFeedbackSchema>
