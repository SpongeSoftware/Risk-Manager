/**
 * Bitwise role flags for user access control.
 * Roles are additive — a user can hold multiple roles by ORing flags together.
 * Use {@link hasRole} to test membership.
 *
 * @example
 * const role = Role.Supervisor | Role.Admin // 6
 * hasRole(role, Role.Admin) // true
 */
export const Role = {
	/** Students can view and edit risk assessments for their active team. */
	Student: 1,
	/** Supervisors manage team members, leave feedback, and view team audit trails. */
	Supervisor: 2,
	/** Admins have full access — users, teams, semesters, and all audits. */
	Admin: 4,
} as const

/** Union type of valid role flag values (1, 2, or 4). */
export type RoleFlag = (typeof Role)[keyof typeof Role]

/**
 * Tests whether a user's role bitmask includes the given flag.
 *
 * @param userRole - The integer bitmask stored in `users.role`.
 * @param flag - A {@link Role} constant to test for.
 * @returns `true` if the user holds the specified role flag.
 *
 * @example
 * hasRole(6, Role.Supervisor) // true  (6 = Supervisor | Admin)
 * hasRole(1, Role.Admin)      // false
 */
export function hasRole(userRole: number, flag: number): boolean {
	return (userRole & flag) !== 0
}

/**
 * Converts a role bitmask to a human-readable comma-separated label string.
 * Multiple roles are listed in Admin → Supervisor → Student priority order.
 *
 * @param role - The integer role bitmask.
 * @returns A label string such as `"Admin"`, `"Supervisor, Student"`, or `"Unknown"`.
 *
 * @example
 * getRoleLabel(4) // "Admin"
 * getRoleLabel(6) // "Admin, Supervisor"
 * getRoleLabel(1) // "Student"
 */
export function getRoleLabel(role: number): string {
	const labels: string[] = []
	if (hasRole(role, Role.Admin)) labels.push("Admin")
	if (hasRole(role, Role.Supervisor)) labels.push("Supervisor")
	if (hasRole(role, Role.Student)) labels.push("Student")
	return labels.join(", ") || "Unknown"
}
