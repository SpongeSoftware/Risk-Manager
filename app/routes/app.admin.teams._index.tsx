import { useNavigate } from "react-router"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import type { Route } from "./+types/app.admin.teams._index"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { getAllTeams } from "../server/queries"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	const teams = await getAllTeams()
	return { teams }
}

export default function AdminTeamsPage({ loaderData }: Route.ComponentProps) {
	const { teams } = loaderData
	const navigate = useNavigate()

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

			<DataTable value={teams} stripedRows emptyMessage="No teams found.">
				<Column field="name" header="Team Name" />
				<Column header="Semester" body={(t) => t.semester.name} />
				<Column
					header="Status"
					body={(t) =>
						t.semester.isActive
							? <Tag severity="success" value="Active" />
							: <Tag severity="danger" value="Inactive" />
					}
				/>
				<Column
					header="Actions"
					body={(t) => (
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
