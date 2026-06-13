import { useState } from "react"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { InputText } from "primereact/inputtext"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import { FilterMatchMode } from "primereact/api"
import type { Route } from "./+types/app.admin.audits"
import { requireRoleLoader } from "../server/auth"
import type { Audit } from "../server/schema"
import { Role } from "../server/schema"
import { getAllAudits } from "../server/queries/audits"
import { formatDateTime } from "../lib/formatters"

export async function loader(args: Route.LoaderArgs) {
	return requireRoleLoader(args, Role.Admin, async () => {
		const audits = await getAllAudits()
		return { audits }
	})
}

function AuditValue({ value }: { value: string | null }) {
	if (!value) return <span>—</span>
	let parsed: unknown
	try {
		parsed = JSON.parse(value)
	} catch {
		return <span>{value}</span>
	}
	return (
		<pre style={{ fontSize: "0.7rem", maxWidth: 280, whiteSpace: "pre-wrap", margin: 0 }}>
			{JSON.stringify(parsed, null, 2)}
		</pre>
	)
}

export default function AdminAuditsPage({ loaderData }: Route.ComponentProps) {
	const { audits } = loaderData

	const [globalFilterValue, setGlobalFilterValue] = useState("")
	const [filters, setFilters] = useState({
		global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
	})

	function onGlobalFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value
		setFilters({ global: { value: value || null, matchMode: FilterMatchMode.CONTAINS } })
		setGlobalFilterValue(value)
	}

	const tableHeader = (
		<div className="flex justify-end">
			<IconField iconPosition="left">
				<InputIcon className="pi pi-search" />
				<InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search audit log..." />
			</IconField>
		</div>
	)

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
				paginator
				rows={25}
				rowsPerPageOptions={[10, 25, 50]}
				filters={filters}
				globalFilterFields={["entityType", "entityId", "action", "createdBy"]}
				header={tableHeader}
				sortMode="single"
				removableSort
			>
				<Column header="Date" body={(a: Audit) => formatDateTime(a.createdDate)} sortable field="createdDate" />
				<Column header="Entity" body={(a: Audit) => a.entityType.replace("_", " ")} className="capitalize" sortable field="entityType" />
				<Column header="ID" field="entityId" sortable />
				<Column header="Action" field="action" className="capitalize" sortable />
				<Column header="Field" body={(a: Audit) => a.fieldChanged ?? "—"} />
				<Column header="Old" body={(a: Audit) => <AuditValue value={a.oldValue} />} />
				<Column header="New" body={(a: Audit) => <AuditValue value={a.newValue} />} />
				<Column header="By" field="createdBy" sortable />
			</DataTable>
		</div>
	)
}
