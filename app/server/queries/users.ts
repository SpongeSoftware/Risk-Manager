import { eq } from "drizzle-orm"
import { db } from "../db"
import { users } from "../schema"
import type { NewUser } from "../schema"

/**
 * Fetches a single user by email address, excluding soft-deleted records.
 *
 * @param email - The email address to look up.
 * @returns The matching user record, or `undefined` if not found.
 */
export async function getUserByEmail(email: string) {
	return db.query.users.findFirst({
		where: (u, { eq, and, isNull }) => and(eq(u.email, email), isNull(u.deletedAt)),
	})
}

/**
 * Fetches a single user by their internal UUID, excluding soft-deleted records.
 *
 * @param id - The user's internal UUID.
 * @returns The matching user record, or `undefined` if not found.
 */
export async function getUserById(id: string) {
	return db.query.users.findFirst({
		where: (u, { eq, and, isNull }) => and(eq(u.id, id), isNull(u.deletedAt)),
	})
}

/**
 * Fetches all users ordered by full name, excluding soft-deleted records.
 *
 * @returns An array of user records.
 */
export async function getAllUsers() {
	return db.query.users.findMany({
		where: (u, { isNull }) => isNull(u.deletedAt),
		orderBy: (u, { asc }) => asc(u.fullName),
	})
}

/**
 * Inserts a new user record into the database.
 *
 * @param data - The full user insert payload including `id`, `email`, `role`, and audit columns.
 * @returns The newly created user record.
 */
export async function createUser(data: NewUser) {
	const [user] = await db.insert(users).values(data).returning()
	return user!
}

/**
 * Links a WorkOS user ID to an existing database user on their first sign-in.
 * Called by {@link requireUser} when `workosId` is still null after account lookup.
 *
 * @param id - The user's internal UUID.
 * @param workosId - The WorkOS user ID to associate.
 */
export async function updateUserWorkosId(id: string, workosId: string) {
	await db
		.update(users)
		.set({ workosId, modifiedDate: new Date().toISOString(), modifiedBy: id })
		.where(eq(users.id, id))
}

/**
 * Updates a user's role bitmask. Only callable by Admin-flagged accounts.
 *
 * @param id - The user's internal UUID.
 * @param role - The new role bitmask (combination of {@link Role} flags).
 * @param actorId - The ID of the Admin performing the change, used for audit columns.
 */
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

/**
 * Soft-deletes a user by setting `deletedAt` and `deletedBy`. The record is
 * retained for audit trail integrity but excluded from all normal queries.
 *
 * @param id - The user's internal UUID.
 * @param actorId - The ID of the Admin performing the deletion.
 */
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

/**
 * Fetches all users including soft-deleted records. Used for audit log display
 * where deleted user references must still resolve.
 *
 * @returns An array of all user records.
 */
export async function getUsersWithNoDeletedFilter() {
	return db.select().from(users)
}

/**
 * Checks whether any non-system users exist in the database.
 * Used during bootstrap to determine if `BOOTSTRAP_ADMIN_EMAIL` may self-provision.
 *
 * @returns `true` if no non-system, non-deleted users exist; `false` otherwise.
 */
export async function isFirstUser(): Promise<boolean> {
	const result = await db.query.users.findFirst({
		where: (u, { and, isNull, ne }) => and(isNull(u.deletedAt), ne(u.id, "system")),
	})
	return !result
}
