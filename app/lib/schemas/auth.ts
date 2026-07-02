import { z } from "zod/v4"

/** Validation schema for the login form (`/login`). */
export const loginSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
})

/** Validation schema for the invite-link set-password form (`/set-password`). */
export const setPasswordSchema = z
	.object({
		token: z.string().min(1),
		password: z.string().min(10, "Password must be at least 10 characters"),
		confirmPassword: z.string(),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

/** Inferred TypeScript type for the login form payload. */
export type LoginInput = z.infer<typeof loginSchema>
/** Inferred TypeScript type for the set-password form payload. */
export type SetPasswordInput = z.infer<typeof setPasswordSchema>
