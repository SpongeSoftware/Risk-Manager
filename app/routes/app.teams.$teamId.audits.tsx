import { data } from "react-router"
import type { Route } from "./+types/app.teams.$teamId.audits"
import { requireUser } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamById } from "../server/queries"
import { getAuditsForTeam } from "../server/queries/audits"
import { formatDateTime } from "../lib/formatters"

export async function loader({ request, params }: Route.LoaderArgs) {
	const user = await requireUser(request)

	if (!hasRole(user.role, Role.Supervisor) && !hasRole(user.role, Role.Admin)) {
		throw data("Access denied", { status: 403 })
	}

	const teamId = Number(params.teamId)
	const team = await getTeamById(teamId)
	if (!team) throw data("Not found", { status: 404 })

	const audits = await getAuditsForTeam(teamId)
	return { team, audits }
}

export default function TeamAuditsPage({ loaderData }: Route.ComponentProps) {
	const { team, audits } = loaderData

	return (
		<div>
			<a
				href={`/teams/${team.id}`}
				className="text-sm text-purple-600 dark:text-purple-400 hover:underline mb-3 block"
			>
				← Back to team
			</a>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				{team.name} — Audit Trail
			</h1>

			<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-surface-50 dark:bg-surface-900">
							{["Date", "Entity", "ID", "Action", "Field", "Changed By"].map((h) => (
								<th key={h} className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{audits.length === 0 && (
							<tr>
								<td colSpan={6} className="px-4 py-8 text-center text-surface-500">
									No audit entries yet.
								</td>
							</tr>
						)}
						{audits.map((a) => (
							<tr key={a.id} className="border-t border-surface-100 dark:border-surface-800">
								<td className="px-4 py-3 text-surface-500">{formatDateTime(a.createdDate)}</td>
								<td className="px-4 py-3 capitalize">{a.entityType.replace("_", " ")}</td>
								<td className="px-4 py-3 text-surface-500">{a.entityId}</td>
								<td className="px-4 py-3 capitalize">{a.action}</td>
								<td className="px-4 py-3 text-surface-500">{a.fieldChanged ?? "—"}</td>
								<td className="px-4 py-3 text-surface-500">{a.createdBy}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
