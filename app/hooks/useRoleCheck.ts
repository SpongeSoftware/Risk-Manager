import { useCurrentUser } from "./useCurrentUser"
import { hasRole, Role } from "../lib/roles"

export function useRoleCheck() {
	const user = useCurrentUser()

	return {
		isStudent: hasRole(user.role, Role.Student),
		isSupervisor: hasRole(user.role, Role.Supervisor),
		isAdmin: hasRole(user.role, Role.Admin),
		hasRole: (flag: number) => hasRole(user.role, flag),
	}
}
