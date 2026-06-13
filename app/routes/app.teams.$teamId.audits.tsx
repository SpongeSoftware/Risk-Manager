import { data } from "react-router"
import { Link } from "react-router"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
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
			<Link
				to={`/teams/${team.id}`}
				className="text-sm text-purple-600 dark:text-purple-400 hover:underline mb-3 block"
			>
				← Back to team
			</Link>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				{team.name} — Audit Trail
			</h1>

			<DataTable
				value={audits}
				stripedRows
				emptyMessage="No audit entries yet."
				className="text-sm"
				scrollable
			>
				<Column header="Date" body={(a) => formatDateTime(a.createdDate)} />
				<Column header="Entity" body={(a) => a.entityType.replace("_", " ")} className="capitalize" />
				<Column header="ID" field="entityId" />
				<Column header="Action" field="action" className="capitalize" />
				<Column header="Field" body={(a) => a.fieldChanged ?? "—"} />
				<Column header="Changed By" field="createdBy" />
			</DataTable>
		</div>
	)
}
