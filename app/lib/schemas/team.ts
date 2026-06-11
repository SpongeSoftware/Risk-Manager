import { z } from "zod/v4"

export const createTeamSchema = z.object({
	name: z.string().min(2, "Team name must be at least 2 characters"),
	semesterId: z.coerce.number().int().positive(),
})

export const addTeamMemberSchema = z.object({
	userId: z.string().min(1),
	memberRole: z.enum(["student", "supervisor"]),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>
