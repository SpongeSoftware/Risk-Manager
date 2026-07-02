import { createCookie } from "react-router"
import { env } from "../lib/env"
import { generateToken, hashToken } from "./password"
import {
	createSessionRow,
	deleteExpiredSessions,
	deleteSession,
	getSessionWithUser,
} from "./queries/sessions"

/** Session lifetime: 30 days. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/**
 * The session cookie holds a raw opaque token; the DB stores only its SHA-256
 * hash. The cookie is additionally signed with `SESSION_SECRET` so tampered
 * values are rejected before any DB lookup.
 */
const sessionCookie = createCookie("rm_session", {
	httpOnly: true,
	secure: env.APP_ENV === "production",
	sameSite: "lax",
	path: "/",
	secrets: [env.SESSION_SECRET],
	maxAge: SESSION_MAX_AGE_SECONDS,
})

/**
 * Creates a DB-backed session for a user and returns the `Set-Cookie` header
 * value carrying the raw token. Also opportunistically purges expired sessions.
 *
 * @param userId - The authenticated user's ID.
 * @returns The serialized cookie for the response headers.
 */
export async function createSession(userId: string): Promise<string> {
	await deleteExpiredSessions()
	const token = generateToken()
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString()
	await createSessionRow(hashToken(token), userId, expiresAt)
	return sessionCookie.serialize(token)
}

/**
 * Resolves the request's session cookie to a live user record.
 *
 * @param request - The incoming HTTP request.
 * @returns The user row, or `null` if there is no cookie, the signature is
 *   invalid, the session is expired/revoked, or the user is soft-deleted.
 */
export async function getSessionUser(request: Request) {
	const token: unknown = await sessionCookie.parse(request.headers.get("Cookie"))
	if (typeof token !== "string" || token.length === 0) return null

	const session = await getSessionWithUser(hashToken(token))
	if (!session) return null

	if (session.expiresAt < new Date().toISOString()) {
		await deleteSession(session.id)
		return null
	}

	if (session.user.deletedAt) return null
	return session.user
}

/**
 * Revokes the request's session (if any) and returns a `Set-Cookie` header
 * value that clears the cookie.
 *
 * @param request - The incoming HTTP request.
 * @returns The serialized expiring cookie for the response headers.
 */
export async function destroySession(request: Request): Promise<string> {
	const token: unknown = await sessionCookie.parse(request.headers.get("Cookie"))
	if (typeof token === "string" && token.length > 0) {
		await deleteSession(hashToken(token))
	}
	return sessionCookie.serialize("", { maxAge: 0 })
}
