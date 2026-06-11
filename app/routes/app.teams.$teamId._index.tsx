import { data } from "react-router"
import type { Route } from "./+types/app.teams.$teamId._index"
import { requireUser } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamById, isUserInTeam, getAssessmentsForTeam } from "../server/queries"

export async function loader({ request, params }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const teamId = Number(params.teamId)

	const team = await getTeamById(teamId)
	if (!team) throw data("Team not found", { status: 404 })

	if (!hasRole(user.role, Role.Admin)) {
		const inTeam = await isUserInTeam(user.id, teamId)
		if (!inTeam) throw data("Access denied", { status: 403 })
	}

	const assessments = await getAssessmentsForTeam(teamId)
	const isActive = team.semester.isActive

	return { user, team, assessments, isActive }
}

export default function TeamDetailPage({ loaderData }: Route.ComponentProps) {
	const { user, team, assessments, isActive } = loaderData
	const canEdit =
		isActive &&
		(hasRole(user.role, Role.Admin) || hasRole(user.role, Role.Supervisor))

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
						{team.name}
					</h1>
					<p className="text-surface-500 text-sm mt-1">
						{team.semester.name} {team.semester.year}
						{!isActive && (
							<span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">
								Inactive
							</span>
						)}
					</p>
				</div>
				{canEdit && (
					<a
						href={`/teams/${team.id}/assessments/new`}
						className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
					>
						<i className="pi pi-plus mr-2" />
						New Assessment
					</a>
				)}
			</div>

			<div className="flex gap-3 mb-6">
				<a
					href={`/teams/${team.id}/members`}
					className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
				>
					<i className="pi pi-users mr-1" />
					Members
				</a>
				<a
					href={`/teams/${team.id}/report`}
					className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
				>
					<i className="pi pi-file-pdf mr-1" />
					Report
				</a>
				{(hasRole(user.role, Role.Supervisor) || hasRole(user.role, Role.Admin)) && (
					<a
						href={`/teams/${team.id}/audits`}
						className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
					>
						<i className="pi pi-list mr-1" />
						Audit Trail
					</a>
				)}
			</div>

			{assessments.length === 0 ? (
				<p className="text-surface-500">No risk assessments yet.</p>
			) : (
				<div className="space-y-3">
					{assessments.map((a) => (
						<a
							key={a.id}
							href={`/teams/${team.id}/assessments/${a.id}`}
							className="block p-4 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-purple-500 transition-colors"
						>
							<div className="flex items-center justify-between">
								<h3 className="font-medium text-surface-900 dark:text-surface-0">{a.title}</h3>
								<span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
									{a.status}
								</span>
							</div>
							<p className="text-sm text-surface-500 mt-1">{a.framework}</p>
						</a>
					))}
				</div>
			)}
		</div>
	)
}
