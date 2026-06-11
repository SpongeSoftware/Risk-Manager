import { NavLink } from "react-router"
import type { User } from "../../server/schema"
import { hasRole, Role } from "../../lib/roles"
import { toggleSidebar } from "../../store"

interface SidebarProps {
	user: User
	collapsed: boolean
}

interface NavItem {
	to: string
	icon: string
	label: string
	roles?: number[]
}

const navItems: NavItem[] = [
	{ to: "/", icon: "pi pi-home", label: "Dashboard" },
	{ to: "/teams", icon: "pi pi-users", label: "Teams" },
	{
		to: "/admin/users",
		icon: "pi pi-user",
		label: "Users",
		roles: [Role.Admin],
	},
	{
		to: "/admin/teams",
		icon: "pi pi-sitemap",
		label: "Manage Teams",
		roles: [Role.Admin],
	},
	{
		to: "/admin/semesters",
		icon: "pi pi-calendar",
		label: "Semesters",
		roles: [Role.Admin],
	},
	{
		to: "/admin/audits",
		icon: "pi pi-list",
		label: "All Audits",
		roles: [Role.Admin],
	},
]

/**
 * Left-hand navigation sidebar rendered inside {@link AppShell}.
 * Filters navigation items based on the user's role flags so that admin-only
 * routes are hidden from students and supervisors.
 * Includes a collapse toggle that switches between full-label and icon-only modes.
 *
 * @param props - Component props.
 * @param props.user - The authenticated user, used for role-based nav filtering.
 * @param props.collapsed - Whether the sidebar is in icon-only collapsed mode.
 */
export function Sidebar({ user, collapsed }: SidebarProps) {
	const visibleItems = navItems.filter((item) => {
		if (!item.roles) return true
		return item.roles.some((r) => hasRole(user.role, r))
	})

	return (
		<aside className={`sidebar bg-surface-900 text-white flex flex-col ${collapsed ? "collapsed" : ""}`}>
			<div className="flex items-center justify-between px-4 py-4 border-b border-surface-700">
				{!collapsed && (
					<span className="font-bold text-lg text-purple-400">Risk Manager</span>
				)}
				<button
					onClick={toggleSidebar}
					className="p-2 rounded hover:bg-surface-700 transition-colors ml-auto"
					aria-label="Toggle sidebar"
					type="button"
				>
					<i className={`pi ${collapsed ? "pi-bars" : "pi-times"}`} />
				</button>
			</div>

			<nav className="flex-1 py-4">
				{visibleItems.map((item) => (
					<NavLink
						key={item.to}
						to={item.to}
						end={item.to === "/"}
						className={({ isActive }) =>
							`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-700 ${
								isActive ? "bg-purple-700 text-white" : "text-surface-300"
							}`
						}
					>
						<i className={`${item.icon} text-lg`} />
						{!collapsed && <span className="text-sm font-medium">{item.label}</span>}
					</NavLink>
				))}
			</nav>
		</aside>
	)
}
