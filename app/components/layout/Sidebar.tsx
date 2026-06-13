import { NavLink, useViewTransitionState } from "react-router"
import { Button } from "primereact/button"
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
]

const adminItems: NavItem[] = [
	{ to: "/admin/users", icon: "pi pi-user", label: "Users" },
	{ to: "/admin/teams", icon: "pi pi-sitemap", label: "Teams" },
	{ to: "/admin/semesters", icon: "pi pi-calendar", label: "Semesters" },
	{ to: "/admin/audits", icon: "pi pi-list", label: "Audit Log" },
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
function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
	const isTransitioning = useViewTransitionState(item.to)

	return (
		<NavLink
			to={item.to}
			end={item.to === "/"}
			viewTransition
			className={({ isActive }) =>
				`nav-item flex items-center gap-3 px-4 py-3 transition-colors${isActive ? " active" : ""}${isTransitioning ? " transitioning" : ""}`
			}
		>
			<i className={`${item.icon} text-lg`} />
			{!collapsed && <span className="text-sm font-medium">{item.label}</span>}
		</NavLink>
	)
}

export function Sidebar({ user, collapsed }: SidebarProps) {
	const isAdmin = hasRole(user.role, Role.Admin)

	return (
		<aside className={`sidebar flex flex-col ${collapsed ? "collapsed" : ""}`}>
			<div className="sidebar-header flex items-center justify-between px-4 py-4 border-b">
				{collapsed ? (
					<img src="/favicon.svg" alt="Risk Manager" className="h-7 w-7" />
				) : (
					<img src="/logo.svg" alt="Risk Manager" className="h-8" />
				)}
				<Button
					icon={`pi ${collapsed ? "pi-bars" : "pi-times"}`}
					text
					rounded
					size="small"
					onClick={toggleSidebar}
					className="sidebar-toggle ml-auto"
					aria-label="Toggle sidebar"
					type="button"
				/>
			</div>

			<nav className="flex-1 py-4">
				{navItems.map((item) => (
					<NavItem key={item.to} item={item} collapsed={collapsed} />
				))}

				{isAdmin && (
					<>
						<div className="sidebar-divider mx-4 my-3 border-t" />
						{!collapsed && (
							<p className="sidebar-section-label px-4 pb-1 text-xs font-semibold uppercase tracking-wider">
								Administration
							</p>
						)}
						{adminItems.map((item) => (
							<NavItem key={item.to} item={item} collapsed={collapsed} />
						))}
					</>
				)}
			</nav>
		</aside>
	)
}
