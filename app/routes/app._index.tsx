import { redirect } from "react-router"
import type { Route } from "./+types/app._index"
import { requireUser } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamsForSupervisor, getActiveTeamsForUser } from "../server/queries"

export async function loader({ request }: Route.LoaderArgs) {
	const user = await requireUser(request)

	if (hasRole(user.role, Role.Admin)) {
		const { getAllTeams } = await import("../server/queries/teams")
		const teams = await getAllTeams()
		return { user, teams, view: "admin" as const }
	}

	if (hasRole(user.role, Role.Supervisor)) {
		const teams = await getTeamsForSupervisor(user.id)
		return { user, teams, view: "supervisor" as const }
	}

	const teams = await getActiveTeamsForUser(user.id)
	if (teams.length === 1) {
		throw redirect(`/teams/${teams[0]!.id}`)
	}
	return { user, teams, view: "student" as const }
}

export default function DashboardPage({ loaderData }: Route.ComponentProps) {
	const { user, teams, view } = loaderData

	return (
		<div>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				Welcome, {user.fullName}
			</h1>

			{view === "admin" && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<StatCard icon="pi pi-users" label="Total Teams" value={teams.length} />
				</div>
			)}

			<div>
				<h2 className="text-lg font-semibold mb-4 text-surface-700 dark:text-surface-300">
					{view === "admin" ? "All Teams" : view === "supervisor" ? "Your Teams" : "Your Active Teams"}
				</h2>
				{teams.length === 0 ? (
					<p className="text-surface-500">No teams found.</p>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{teams.map((team) => (
							<a
								key={team.id}
								href={`/teams/${team.id}`}
								className="block p-5 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-purple-500 transition-colors"
							>
								<h3 className="font-semibold text-surface-900 dark:text-surface-0">{team.name}</h3>
							</a>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
	return (
		<div className="p-5 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
			<div className="flex items-center gap-3 mb-2">
				<i className={`${icon} text-purple-500 text-xl`} />
				<span className="text-surface-600 dark:text-surface-400 text-sm">{label}</span>
			</div>
			<p className="text-3xl font-bold text-surface-900 dark:text-surface-0">{value}</p>
		</div>
	)
}
