import { redirect } from "react-router"
import type { Route } from "./+types/app.teams._index"
import { requireUserLoader } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getAllTeams, getActiveTeamsForUser, getTeamsForSupervisor } from "../server/queries"

export async function loader(args: Route.LoaderArgs) {
	return requireUserLoader(args, async (user) => {
		if (hasRole(user.role, Role.Admin)) {
			const teams = await getAllTeams()
			return { user, teams }
		}

		if (hasRole(user.role, Role.Supervisor)) {
			const { teamsShowInactive } = { teamsShowInactive: false }
			const teams = await getTeamsForSupervisor(user.id, !teamsShowInactive)
			return { user, teams }
		}

		const teams = await getActiveTeamsForUser(user.id)
		if (teams.length === 1) throw redirect(`/teams/${teams[0]!.id}`)
		return { user, teams }
	})
}

export default function TeamsPage({ loaderData }: Route.ComponentProps) {
	const { teams } = loaderData

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">Teams</h1>
			</div>

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
							<h3 className="font-semibold text-surface-900 dark:text-surface-0 mb-1">
								{team.name}
							</h3>
							{"semester" in team && (
								<p className="text-sm text-surface-500">{(team as { semester: { name: string } }).semester.name}</p>
							)}
						</a>
					))}
				</div>
			)}
		</div>
	)
}
