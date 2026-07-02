import { eq, lt } from "drizzle-orm"
import { db } from "../db"
import { sessions } from "../schema"

/**
 * Login-session persistence. Sessions are infrastructure rather than domain
 * entities — no soft deletes, no audit columns, and no `appendAudit()` calls.
 * Rows are keyed by the SHA-256 hash of the raw cookie token.
 */

/**
 * Inserts a new session row.
 *
 * @param id - SHA-256 hash of the raw session token.
 * @param userId - The user the session belongs to.
 * @param expiresAt - ISO timestamp after which the session is invalid.
 */
export async function createSessionRow(id: string, userId: string, expiresAt: string) {
	await db.insert(sessions).values({ id, userId, expiresAt })
}

/**
 * Fetches a session with its (non-deleted) user.
 *
 * @param id - SHA-256 hash of the raw session token.
 * @returns The session row with `user` populated, or `undefined`.
 */
export async function getSessionWithUser(id: string) {
	return db.query.sessions.findFirst({
		where: (s, { eq }) => eq(s.id, id),
		with: { user: true },
	})
}

/**
 * Deletes a single session row (hard delete — sessions are not soft-deleted).
 *
 * @param id - SHA-256 hash of the raw session token.
 */
export async function deleteSession(id: string) {
	await db.delete(sessions).where(eq(sessions.id, id))
}

/**
 * Deletes all sessions for a user, revoking their access everywhere.
 * Called when an admin regenerates an invite (password reset).
 *
 * @param userId - The user whose sessions should be revoked.
 */
export async function deleteSessionsForUser(userId: string) {
	await db.delete(sessions).where(eq(sessions.userId, userId))
}

/**
 * Purges expired session rows. Called opportunistically on login so the table
 * doesn't grow unbounded without needing a scheduled job.
 */
export async function deleteExpiredSessions() {
	await db.delete(sessions).where(lt(sessions.expiresAt, new Date().toISOString()))
}
