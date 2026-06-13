import { data } from "react-router"
import { Link, useNavigate } from "react-router"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
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
	const navigate = useNavigate()
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
					<div className="flex items-center gap-2 mt-1">
						<span className="text-surface-500 text-sm">
							{team.semester.name} {team.semester.year}
						</span>
						{!isActive && <Tag severity="danger" value="Inactive" />}
					</div>
				</div>
				{canEdit && (
					<Button
						label="New Assessment"
						icon="pi pi-plus"
						onClick={() => navigate(`/teams/${team.id}/assessments/new`)}
					/>
				)}
			</div>

			<div className="flex gap-2 mb-6">
				<Button
					label="Members"
					icon="pi pi-users"
					text
					size="small"
					onClick={() => navigate(`/teams/${team.id}/members`)}
				/>
				<Button
					label="Report"
					icon="pi pi-file-pdf"
					text
					size="small"
					onClick={() => navigate(`/teams/${team.id}/report`)}
				/>
				{(hasRole(user.role, Role.Supervisor) || hasRole(user.role, Role.Admin)) && (
					<Button
						label="Audit Trail"
						icon="pi pi-list"
						text
						size="small"
						onClick={() => navigate(`/teams/${team.id}/audits`)}
					/>
				)}
			</div>

			{assessments.length === 0 ? (
				<p className="text-surface-500">No risk assessments yet.</p>
			) : (
				<div className="space-y-3">
					{assessments.map((a) => (
						<Link
							key={a.id}
							to={`/teams/${team.id}/assessments/${a.id}`}
							className="flex items-center justify-between p-4 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-purple-500 transition-colors"
						>
							<div>
								<h3 className="font-medium text-surface-900 dark:text-surface-0">{a.title}</h3>
								<p className="text-sm text-surface-500 mt-0.5">{a.framework}</p>
							</div>
							<Tag value={a.status} severity="info" />
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
