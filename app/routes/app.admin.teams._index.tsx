import { useState } from "react"
import { useNavigate } from "react-router"
import type { Route } from "./+types/app.admin.teams._index"

import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import { InputText } from "primereact/inputtext"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import { FilterMatchMode } from "primereact/api"
import { requireRoleLoader } from "../server/auth"
import { Role } from "../server/schema"
import { getAllTeams } from "../server/queries"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Teams" }]

export async function loader(args: Route.LoaderArgs) {
	return requireRoleLoader(args, Role.Admin, async () => {
		const teams = await getAllTeams()
		return { teams }
	})
}

export default function AdminTeamsPage({ loaderData }: Route.ComponentProps) {
	const { teams } = loaderData
	const navigate = useNavigate()

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
				<InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search teams..." />
			</IconField>
		</div>
	)

	const flatTeams = teams.map((t) => ({ ...t, semesterName: t.semester.name, semesterActive: t.semester.isActive }))

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
					Team Management
				</h1>
				<Button
					label="New Team"
					icon="pi pi-plus"
					onClick={() => navigate("/admin/teams/new")}
				/>
			</div>

			<DataTable
				value={flatTeams}
				stripedRows
				emptyMessage="No teams found."
				paginator
				rows={10}
				rowsPerPageOptions={[5, 10, 25]}
				filters={filters}
				globalFilterFields={["name", "semesterName"]}
				header={tableHeader}
				sortMode="single"
				removableSort
			>
				<Column field="name" header="Team Name" sortable />
				<Column field="semesterName" header="Semester" sortable />
				<Column
					header="Status"
					field="semesterActive"
					sortable
					body={(t: (typeof flatTeams)[number]) =>
						t.semesterActive
							? <Tag severity="success" value="Active" />
							: <Tag severity="danger" value="Inactive" />
					}
				/>
				<Column
					header="Actions"
					body={(t: (typeof flatTeams)[number]) => (
						<div className="flex gap-2">
							<Button
								label="View"
								size="small"
								text
								onClick={() => navigate(`/teams/${t.id}`)}
							/>
							<Button
								label="Members"
								size="small"
								text
								onClick={() => navigate(`/teams/${t.id}/members`)}
							/>
						</div>
					)}
				/>
			</DataTable>
		</div>
	)
}
