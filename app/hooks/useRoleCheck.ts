import { useCurrentUser } from "./useCurrentUser"
import { hasRole, Role } from "../lib/roles"

/**
 * Returns convenience role flags for the currently authenticated user.
 * Note: `isAdmin` supersedes `isSupervisor` per business rules — an Admin
 * user with both flags should be treated as Admin, not Supervisor.
 *
 * @returns An object with:
 * - `isStudent` — `true` if the user holds the Student role flag
 * - `isSupervisor` — `true` if the user holds the Supervisor role flag
 * - `isAdmin` — `true` if the user holds the Admin role flag
 * - `hasRole(flag)` — generic test for any {@link Role} constant or combined bitmask
 */
export function useRoleCheck() {
	const user = useCurrentUser()

	return {
		isStudent: hasRole(user.role, Role.Student),
		isSupervisor: hasRole(user.role, Role.Supervisor),
		isAdmin: hasRole(user.role, Role.Admin),
		hasRole: (flag: number) => hasRole(user.role, flag),
	}
}
