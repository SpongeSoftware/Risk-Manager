import { z } from "zod/v4"

/** Validation schema for the admin "Create Team" form (`/admin/teams/new`). */
export const createTeamSchema = z.object({
	name: z.string().min(2, "Team name must be at least 2 characters"),
	semesterId: z.coerce.number().int().positive(),
})

/** Validation schema for the "Add Member" form action on `/teams/:teamId/members`. */
export const addTeamMemberSchema = z.object({
	userId: z.string().min(1),
	memberRole: z.enum(["student", "supervisor"]),
})

/** Inferred TypeScript type for the create team form payload. */
export type CreateTeamInput = z.infer<typeof createTeamSchema>
/** Inferred TypeScript type for the add team member form payload. */
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>
