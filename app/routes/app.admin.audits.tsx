import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import type { Route } from "./+types/app.admin.audits"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { getAllAudits } from "../server/queries/audits"
import { formatDateTime } from "../lib/formatters"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	const audits = await getAllAudits()
	return { audits }
}

export default function AdminAuditsPage({ loaderData }: Route.ComponentProps) {
	const { audits } = loaderData

	return (
		<div>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				System Audit Trail
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
				<Column header="Old" body={(a) => <span className="max-w-32 truncate block">{a.oldValue ?? "—"}</span>} />
				<Column header="New" body={(a) => <span className="max-w-32 truncate block">{a.newValue ?? "—"}</span>} />
				<Column header="By" field="createdBy" />
			</DataTable>
		</div>
	)
}
