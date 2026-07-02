import { z } from "zod/v4"

/** Validation schema for the admin "Create Semester" form (`/admin/semesters/new`). */
export const createSemesterSchema = z.object({
	name: z.string().min(2, "Semester name must be at least 2 characters"),
	year: z.coerce.number().int().min(2000).max(2100),
	period: z.enum(["1", "2", "summer"]),
	startDate: z.string().min(1, "Start date is required"),
	endDate: z.string().min(1, "End date is required"),
	isActive: z.coerce.boolean().default(true),
})

/** Validation schema for the toggle-active/delete row actions on `/admin/semesters`. */
export const semesterActionSchema = z.object({
	id: z.coerce.number().int().positive(),
	isActive: z
		.enum(["true", "false"])
		.transform((v) => v === "true")
		.optional(),
})

/** Inferred TypeScript type for the create semester form payload. */
export type CreateSemesterInput = z.infer<typeof createSemesterSchema>
