import { Link } from "react-router"
import type { Route } from "./+types/app.admin._index"
import { requireRoleLoader } from "../server/auth"
import { Role } from "../server/schema"

export async function loader(args: Route.LoaderArgs) {
	return requireRoleLoader(args, Role.Admin, async () => ({}))
}

const sections = [
	{
		to: "/admin/users",
		icon: "pi pi-user",
		label: "Users",
		description: "Manage user accounts and role assignments",
	},
	{
		to: "/admin/teams",
		icon: "pi pi-sitemap",
		label: "Teams",
		description: "Create and manage teams and their members",
	},
	{
		to: "/admin/semesters",
		icon: "pi pi-calendar",
		label: "Semesters",
		description: "Configure academic semesters and active periods",
	},
	{
		to: "/admin/audits",
		icon: "pi pi-list",
		label: "Audit Log",
		description: "View a full history of all system activity",
	},
]

export default function AdminIndexPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-2">
				Administration
			</h1>
			<p className="text-surface-500 dark:text-surface-400 mb-8">
				Manage users, teams, semesters, and audit logs.
			</p>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{sections.map((s) => (
					<Link
						key={s.to}
						to={s.to}
						className="flex flex-col gap-3 p-6 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-purple-500 hover:shadow-md transition-all"
					>
						<div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
							<i className={`${s.icon} text-purple-600 dark:text-purple-400 text-lg`} />
						</div>
						<div>
							<p className="font-semibold text-surface-900 dark:text-surface-0">{s.label}</p>
							<p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{s.description}</p>
						</div>
					</Link>
				))}
			</div>
		</div>
	)
}
