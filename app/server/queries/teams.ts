import { and, eq } from "drizzle-orm"
import { db } from "../db"
import { teamMembers, teams } from "../schema"
import type { NewTeam } from "../schema"

/**
 * Fetches all teams with their semester relation, ordered by name.
 * Excludes soft-deleted teams.
 *
 * @returns An array of teams each including the linked semester.
 */
export async function getAllTeams() {
	return db.query.teams.findMany({
		where: (t, { isNull }) => isNull(t.deletedAt),
		with: { semester: true },
		orderBy: (t, { asc }) => asc(t.name),
	})
}

/**
 * Fetches a single team by ID with its semester relation.
 * Excludes soft-deleted teams.
 *
 * @param id - The team's numeric ID.
 * @returns The team record with semester, or `undefined` if not found.
 */
export async function getTeamById(id: number) {
	return db.query.teams.findFirst({
		where: (t, { and, eq, isNull }) => and(eq(t.id, id), isNull(t.deletedAt)),
		with: { semester: true },
	})
}

/**
 * Fetches teams where the given user is a supervisor member.
 *
 * @param supervisorId - The supervisor user's internal UUID.
 * @param activeOnly - When `true` (default), only returns teams in active semesters.
 * @returns An array of matching teams, each including the linked semester.
 */
export async function getTeamsForSupervisor(supervisorId: string, activeOnly = true) {
	const allTeams = await db.query.teams.findMany({
		where: (t, { isNull }) => isNull(t.deletedAt),
		with: {
			semester: true,
			members: {
				where: (m, { and, eq, isNull }) =>
					and(eq(m.userId, supervisorId), eq(m.memberRole, "supervisor"), isNull(m.deletedAt)),
			},
		},
	})

	return allTeams.filter((t) => {
		if (t.members.length === 0) return false
		if (activeOnly && !t.semester.isActive) return false
		return true
	})
}

/**
 * Fetches the teams a user belongs to that are in active semesters.
 * Used by {@link requireActiveTeam} to determine whether a student may sign in.
 *
 * @param userId - The user's internal UUID.
 * @returns An array of team records (without semester or member data).
 */
export async function getActiveTeamsForUser(userId: string): Promise<typeof teams.$inferSelect[]> {
	const memberships = await db.query.teamMembers.findMany({
		where: (m, { and, eq, isNull }) =>
			and(eq(m.userId, userId), isNull(m.deletedAt)),
		with: {
			team: {
				with: { semester: true },
			},
		},
	})

	return memberships
		.filter((m) => m.team.semester.isActive && !m.team.deletedAt)
		.map((m) => m.team)
}

/**
 * Inserts a new team record.
 *
 * @param data - The team insert payload including `name`, `semesterId`, and audit columns.
 * @returns The newly created team record.
 */
export async function createTeam(data: NewTeam) {
	const [team] = await db.insert(teams).values(data).returning()
	return team
}

/**
 * Adds a user to a team with the specified role.
 *
 * @param teamId - The target team's numeric ID.
 * @param userId - The user's internal UUID to add.
 * @param memberRole - Either `"student"` or `"supervisor"`.
 * @param actorId - The ID of the user performing this action, used for audit columns.
 */
export async function addTeamMember(
	teamId: number,
	userId: string,
	memberRole: "student" | "supervisor",
	actorId: string,
) {
	await db.insert(teamMembers).values({
		teamId,
		userId,
		memberRole,
		createdBy: actorId,
		modifiedBy: actorId,
	})
}

/**
 * Soft-deletes a team membership by setting `deletedAt` and `deletedBy`.
 *
 * @param teamId - The team's numeric ID.
 * @param userId - The user's internal UUID to remove.
 * @param actorId - The ID of the user performing this action.
 */
export async function removeTeamMember(teamId: number, userId: string, actorId: string) {
	await db
		.update(teamMembers)
		.set({
			deletedAt: new Date().toISOString(),
			deletedBy: actorId,
			modifiedBy: actorId,
			modifiedDate: new Date().toISOString(),
		})
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
}

/**
 * Fetches all active members of a team with their user records.
 * Excludes soft-deleted memberships.
 *
 * @param teamId - The team's numeric ID.
 * @returns An array of team member records each including the linked user.
 */
export async function getTeamMembers(teamId: number) {
	return db.query.teamMembers.findMany({
		where: (m, { and, eq, isNull }) => and(eq(m.teamId, teamId), isNull(m.deletedAt)),
		with: { user: true },
	})
}

/**
 * Checks whether a user is an active member of a team.
 *
 * @param userId - The user's internal UUID.
 * @param teamId - The team's numeric ID.
 * @returns `true` if the user has a non-deleted membership in the team.
 */
export async function isUserInTeam(userId: string, teamId: number): Promise<boolean> {
	const member = await db.query.teamMembers.findFirst({
		where: (m, { and, eq, isNull }) =>
			and(eq(m.userId, userId), eq(m.teamId, teamId), isNull(m.deletedAt)),
	})
	return !!member
}

/**
 * Soft-deletes a team by setting `deletedAt` and `deletedBy`.
 * The record is retained for audit trail integrity.
 *
 * @param id - The team's numeric ID.
 * @param actorId - The ID of the Admin performing the deletion.
 */
export async function softDeleteTeam(id: number, actorId: string) {
	await db
		.update(teams)
		.set({
			deletedAt: new Date().toISOString(),
			deletedBy: actorId,
			modifiedBy: actorId,
			modifiedDate: new Date().toISOString(),
		})
		.where(eq(teams.id, id))
}
