import { and, eq } from "drizzle-orm"
import { db } from "../db"
import { teamMembers, teams } from "../schema"
import type { NewTeam } from "../schema"

export async function getAllTeams() {
	return db.query.teams.findMany({
		where: (t, { isNull }) => isNull(t.deletedAt),
		with: { semester: true },
		orderBy: (t, { asc }) => asc(t.name),
	})
}

export async function getTeamById(id: number) {
	return db.query.teams.findFirst({
		where: (t, { and, eq, isNull }) => and(eq(t.id, id), isNull(t.deletedAt)),
		with: { semester: true },
	})
}

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

export async function createTeam(data: NewTeam) {
	const [team] = await db.insert(teams).values(data).returning()
	return team!
}

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

export async function getTeamMembers(teamId: number) {
	return db.query.teamMembers.findMany({
		where: (m, { and, eq, isNull }) => and(eq(m.teamId, teamId), isNull(m.deletedAt)),
		with: { user: true },
	})
}

export async function isUserInTeam(userId: string, teamId: number): Promise<boolean> {
	const member = await db.query.teamMembers.findFirst({
		where: (m, { and, eq, isNull }) =>
			and(eq(m.userId, userId), eq(m.teamId, teamId), isNull(m.deletedAt)),
	})
	return !!member
}

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
