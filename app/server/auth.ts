import {
	authkitLoader,
	configure,
	getSignInUrl,
	signOut,
	withAuth,
} from "@workos-inc/authkit-react-router"
import { redirect } from "react-router"
import { Role, hasRole } from "./schema"
import { createUser, getUserByEmail, isFirstUser, updateUserWorkosId } from "./queries/users"

configure({
	clientId: process.env["WORKOS_CLIENT_ID"] ?? "",
	apiKey: process.env["WORKOS_API_KEY"] ?? "",
	redirectUri: process.env["WORKOS_REDIRECT_URI"] ?? "",
	cookiePassword: process.env["WORKOS_COOKIE_PASSWORD"] ?? "",
})

export { authkitLoader, getSignInUrl, signOut }

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

export async function requireRole(request: Request, flag: number) {
	const user = await requireUser(request)
	if (!hasRole(user.role, flag)) throw redirect("/")
	return user
}

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
