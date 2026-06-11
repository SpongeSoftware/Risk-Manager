export const Role = {
	Student: 1,
	Supervisor: 2,
	Admin: 4,
} as const

export type RoleFlag = (typeof Role)[keyof typeof Role]

export function hasRole(userRole: number, flag: number): boolean {
	return (userRole & flag) !== 0
}

export function getRoleLabel(role: number): string {
	const labels: string[] = []
	if (hasRole(role, Role.Admin)) labels.push("Admin")
	if (hasRole(role, Role.Supervisor)) labels.push("Supervisor")
	if (hasRole(role, Role.Student)) labels.push("Student")
	return labels.join(", ") || "Unknown"
}
