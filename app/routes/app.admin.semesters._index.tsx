import { data } from "react-router"
import { useNavigate } from "react-router"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import type { Route } from "./+types/app.admin.semesters._index"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { getAllSemesters, updateSemesterActive, softDeleteSemester } from "../server/queries"
import { appendAudit } from "../server/queries/audits"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	const semesters = await getAllSemesters()
	return { semesters }
}

export async function action({ request }: Route.ActionArgs) {
	const actor = await requireRole(request, Role.Admin)
	const formData = await request.formData()
	const intent = formData.get("intent") as string
	const id = Number(formData.get("id"))

	if (intent === "toggle-active") {
		const isActive = formData.get("isActive") === "true"
		await updateSemesterActive(id, isActive, actor.id)
		await appendAudit("semester", id, "updated", actor.id, {
			fieldChanged: "isActive",
			newValue: String(isActive),
		})
	}

	if (intent === "delete") {
		await softDeleteSemester(id, actor.id)
		await appendAudit("semester", id, "deleted", actor.id)
	}

	return data({ ok: true })
}

export default function AdminSemestersPage({ loaderData }: Route.ComponentProps) {
	const { semesters } = loaderData
	const navigate = useNavigate()

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
					Semester Management
				</h1>
				<Button
					label="New Semester"
					icon="pi pi-plus"
					onClick={() => navigate("/admin/semesters/new")}
				/>
			</div>

			<DataTable value={semesters} stripedRows emptyMessage="No semesters found.">
				<Column field="name" header="Name" />
				<Column field="year" header="Year" />
				<Column
					header="Period"
					body={(s) => (s.period === "summer" ? "Summer" : `Semester ${s.period}`)}
				/>
				<Column field="startDate" header="Start" />
				<Column field="endDate" header="End" />
				<Column
					header="Active"
					body={(s) => (
						<form method="post" style={{ display: "inline" }}>
							<input type="hidden" name="intent" value="toggle-active" />
							<input type="hidden" name="id" value={s.id} />
							<input type="hidden" name="isActive" value={String(!s.isActive)} />
							<Tag
								severity={s.isActive ? "success" : "warning"}
								value={s.isActive ? "Active" : "Inactive"}
								className="cursor-pointer"
								onClick={(e) => (e.currentTarget.closest("form") as HTMLFormElement)?.requestSubmit()}
							/>
						</form>
					)}
				/>
				<Column
					header="Actions"
					body={(s) => (
						<form method="post" style={{ display: "inline" }}>
							<input type="hidden" name="intent" value="delete" />
							<input type="hidden" name="id" value={s.id} />
							<Button
								type="submit"
								icon="pi pi-trash"
								severity="danger"
								text
								size="small"
								onClick={(e) => {
									if (!confirm(`Delete ${s.name}?`)) e.preventDefault()
								}}
							/>
						</form>
					)}
				/>
			</DataTable>
		</div>
	)
}
