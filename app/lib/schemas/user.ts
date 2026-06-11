import { z } from "zod/v4"

export const createUserSchema = z.object({
	fullName: z.string().min(2, "Full name must be at least 2 characters"),
	email: z.string().email("Invalid email address"),
	studentId: z.string().optional(),
	role: z.number().int().min(1).max(7),
})

export const updateUserRoleSchema = z.object({
	userId: z.string().min(1),
	role: z.number().int().min(1).max(7),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
