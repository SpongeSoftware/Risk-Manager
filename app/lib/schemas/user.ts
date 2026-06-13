import { z } from "zod/v4"

/** Validation schema for the admin "Create User" form (`/admin/users`). */
export const createUserSchema = z.object({
	fullName: z.string().min(2, "Full name must be at least 2 characters"),
	email: z.string().email("Invalid email address"),
	studentId: z.string().optional(),
	role: z.coerce.number().int().min(1).max(7),
})

/** Validation schema for the "Update Role" form action on `/admin/users`. */
export const updateUserRoleSchema = z.object({
	userId: z.string().min(1),
	role: z.coerce.number().int().min(1).max(7),
})

/** Inferred TypeScript type for the create user form payload. */
export type CreateUserInput = z.infer<typeof createUserSchema>
/** Inferred TypeScript type for the update role form payload. */
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
