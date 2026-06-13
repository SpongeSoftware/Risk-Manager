import {
	authkitLoader,
	configure,
	getSignInUrl,
	signOut,
	withAuth,
} from "@workos-inc/authkit-react-router"
import { redirect } from "react-router"
import type { LoaderFunctionArgs } from "react-router"
import { Role, hasRole } from "./schema"
import { createUser, getUserByEmail, isFirstUser, updateUserWorkosId } from "./queries/users"

configure({
	clientId: process.env["WORKOS_CLIENT_ID"] ?? "",
	apiKey: process.env["WORKOS_API_KEY"] ?? "",
	redirectUri: process.env["WORKOS_REDIRECT_URI"] ?? "",
	cookiePassword: process.env["WORKOS_COOKIE_PASSWORD"] ?? "",
})

export { authkitLoader, getSignInUrl, signOut }

/**
 * Resolves the authenticated user from the WorkOS session and returns their
 * database record. Handles two special cases on first sign-in:
 *
 * 1. **Bootstrap provisioning** — if `BOOTSTRAP_ADMIN_EMAIL` matches the signed-in
 *    email and no non-system users exist yet, a new Admin account is created automatically.
 * 2. **WorkOS ID reconciliation** — if an admin pre-created the account by email only,
 *    `workosId` is linked to the database record on first login.
 *
 * @param request - The incoming HTTP request containing the session cookie.
 * @returns The authenticated user's database record.
 * @throws {Response} Redirects to `/login` if the session is missing or invalid.
 * @throws {Response} Redirects to `/login?error=not_provisioned` if the email has
 *   no pre-provisioned account and is not the bootstrap admin email.
 */
export async function requireUser(request: Request) {
	const { user } = await withAuth({ request } as Parameters<typeof withAuth>[0])

	if (!user?.email) throw redirect("/login")

	let dbUser = await getUserByEmail(user.email)

	const bootstrapEmail = process.env["BOOTSTRAP_ADMIN_EMAIL"]
	if (!dbUser && bootstrapEmail && user.email === bootstrapEmail) {
		const firstUser = await isFirstUser()
		if (firstUser) {
			dbUser = await createUser({
				id: crypto.randomUUID(),
				workosId: user.id,
				fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
				email: user.email,
				role: Role.Admin,
				createdBy: "system",
				modifiedBy: "system",
			})
		}
	}

	if (!dbUser) throw redirect("/login?error=not_provisioned")

	if (!dbUser.workosId && user.id) {
		await updateUserWorkosId(dbUser.id, user.id)
		dbUser = { ...dbUser, workosId: user.id }
	}

	return dbUser
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
	callback: (user: Awaited<ReturnType<typeof requireUser>>) => Promise<T>,
): Promise<T> {
	return callback(await requireUser(args.request))
}

export async function requireRoleLoader<T>(
	args: LoaderFunctionArgs,
	flag: number,
	callback: (user: Awaited<ReturnType<typeof requireUser>>) => Promise<T>,
): Promise<T> {
	return callback(await requireRole(args.request, flag))
}
