import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { Role, hasRole } from "./schema"
import { getSessionUser } from "./session"

/**
 * Resolves the authenticated user from the session cookie and returns their
 * database record. Sessions are DB-backed opaque tokens created at login
 * (see `app/server/session.ts`), so a session is only valid while its row
 * exists, is unexpired, and the user is not soft-deleted.
 *
 * @param request - The incoming HTTP request containing the session cookie.
 * @returns The authenticated user's database record.
 * @throws {Response} Redirects to `/login` if the session is missing, invalid,
 *   expired, or revoked.
 */
export async function requireUser(request: Request) {
	const user = await getSessionUser(request)
	if (!user) throw redirect("/login")
	return user
}

/**
 * Calls {@link requireUser} then verifies the user holds the specified role flag.
 *
 * @param request - The incoming HTTP request.
 * @param flag - A {@link Role} constant (or combined bitmask) to check.
 * @returns The authenticated user's database record.
 * @throws {Response} Redirects to `/` if the user does not hold the required role.
 */
export async function requireRole(request: Request, flag: number) {
	const user = await requireUser(request)
	if (!hasRole(user.role, flag)) throw redirect("/")
	return user
}

/**
 * Guards the application layout. Supervisors and Admins always pass regardless of
 * team or semester state. Students are redirected to `/no-active-team` if they have
 * no team membership in a currently active semester.
 *
 * @param request - The incoming HTTP request.
 * @returns The authenticated user's database record.
 * @throws {Response} All redirects from {@link requireUser}.
 * @throws {Response} Redirects to `/no-active-team` for students with no active team.
 */
export async function requireActiveTeam(request: Request) {
	const dbUser = await requireUser(request)

	const isSupervisorOrAdmin =
		hasRole(dbUser.role, Role.Supervisor) || hasRole(dbUser.role, Role.Admin)

	if (!isSupervisorOrAdmin && hasRole(dbUser.role, Role.Student)) {
		const { getActiveTeamsForUser } = await import("./queries/teams")
		const activeTeams = await getActiveTeamsForUser(dbUser.id)
		if (activeTeams.length === 0) {
			throw redirect("/no-active-team")
		}
	}

	return dbUser
}

export { Role, hasRole }

export async function requireUserLoader<T>(
	args: LoaderFunctionArgs,
	callback: (user: Awaited<ReturnType<typeof requireUser>>) => T | Promise<T>,
): Promise<T> {
	return callback(await requireUser(args.request))
}

export async function requireRoleLoader<T>(
	args: LoaderFunctionArgs,
	flag: number,
	callback: (user: Awaited<ReturnType<typeof requireUser>>) => T | Promise<T>,
): Promise<T> {
	return callback(await requireRole(args.request, flag))
}
