import { eq } from "drizzle-orm"
import { db } from "../db"
import { users } from "../schema"
import type { NewUser } from "../schema"

export async function getUserByEmail(email: string) {
	return db.query.users.findFirst({
		where: (u, { eq, and, isNull }) => and(eq(u.email, email), isNull(u.deletedAt)),
	})
}

export async function getUserById(id: string) {
	return db.query.users.findFirst({
		where: (u, { eq, and, isNull }) => and(eq(u.id, id), isNull(u.deletedAt)),
	})
}

export async function getAllUsers() {
	return db.query.users.findMany({
		where: (u, { isNull }) => isNull(u.deletedAt),
		orderBy: (u, { asc }) => asc(u.fullName),
	})
}

export async function createUser(data: NewUser) {
	const [user] = await db.insert(users).values(data).returning()
	return user!
}

export async function updateUserWorkosId(id: string, workosId: string) {
	await db
		.update(users)
		.set({ workosId, modifiedDate: new Date().toISOString(), modifiedBy: id })
		.where(eq(users.id, id))
}

export async function updateUserRole(
	id: string,
	role: number,
	actorId: string,
) {
	await db
		.update(users)
		.set({ role, modifiedBy: actorId, modifiedDate: new Date().toISOString() })
		.where(eq(users.id, id))
}

export async function softDeleteUser(id: string, actorId: string) {
	await db
		.update(users)
		.set({
			deletedAt: new Date().toISOString(),
			deletedBy: actorId,
			modifiedBy: actorId,
			modifiedDate: new Date().toISOString(),
		})
		.where(eq(users.id, id))
}

export async function getUsersWithNoDeletedFilter() {
	return db.select().from(users)
}

export async function isFirstUser(): Promise<boolean> {
	const result = await db.query.users.findFirst({
		where: (u, { and, isNull, ne }) => and(isNull(u.deletedAt), ne(u.id, "system")),
	})
	return !result
}
