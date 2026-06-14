import { useState } from "react"
import { data, Form } from "react-router"
import { useNavigate } from "react-router"
import type { Route } from "./+types/app.admin.semesters._index"

import { useActionToast } from "../hooks/useActionToast"
import { useFlashToast } from "../hooks/useFlashToast"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import { InputText } from "primereact/inputtext"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import { FilterMatchMode } from "primereact/api"
import { requireRole, requireRoleLoader } from "../server/auth"
import { Role } from "../server/schema"
import { getAllSemesters, updateSemesterActive, softDeleteSemester, getSemesterById } from "../server/queries"
import { appendAudit } from "../server/queries/audits"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Semesters" }]

export async function loader(args: Route.LoaderArgs) {
	return requireRoleLoader(args, Role.Admin, async () => {
		const semesters = await getAllSemesters()
		return { semesters }
	})
}

export async function action({ request }: Route.ActionArgs) {
	const actor = await requireRole(request, Role.Admin)
	const formData = await request.formData()
	const intent = formData.get("intent") as string
	const id = Number(formData.get("id"))

	if (intent === "toggle-active") {
		const isActive = formData.get("isActive") === "true"
		const existing = await getSemesterById(id)
		await updateSemesterActive(id, isActive, actor.id)
		await appendAudit("semester", id, "updated", actor.id, {
			fieldChanged: "isActive",
			oldValue: existing ? String(existing.isActive) : undefined,
			newValue: String(isActive),
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Semester updated" } })
	}

	if (intent === "delete") {
		const existing = await getSemesterById(id)
		await softDeleteSemester(id, actor.id)
		await appendAudit("semester", id, "deleted", actor.id, {
			oldValue: existing ? JSON.stringify(existing) : undefined,
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Semester deleted" } })
	}

	return data({ ok: true })
}

export default function AdminSemestersPage({ loaderData, actionData }: Route.ComponentProps) {
	const { semesters } = loaderData
	const navigate = useNavigate()
	useActionToast(actionData as Parameters<typeof useActionToast>[0])
	useFlashToast()

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
				<InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search semesters..." />
			</IconField>
		</div>
	)

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Semester Management</h1>
				<Button
					label="New Semester"
					icon="pi pi-plus"
					onClick={() => navigate("/admin/semesters/new")}
				/>
			</div>

			<DataTable
				value={semesters}
				scrollable
				stripedRows
				emptyMessage="No semesters found."
				paginator
				rows={10}
				rowsPerPageOptions={[5, 10, 25]}
				filters={filters}
				globalFilterFields={["name", "year"]}
				header={tableHeader}
				sortMode="single"
				removableSort
			>
				<Column field="name" header="Name" sortable />
				<Column field="year" header="Year" sortable />
				<Column
					header="Period"
					field="period"
					sortable
					body={(s: (typeof semesters)[number]) => (s.period === "summer" ? "Summer" : `Semester ${s.period}`)}
				/>
				<Column field="startDate" header="Start" sortable />
				<Column field="endDate" header="End" sortable />
				<Column
					header="Active"
					field="isActive"
					sortable
					body={(s: (typeof semesters)[number]) => (
						<Form method="post" style={{ display: "inline" }}>
							<input type="hidden" name="intent" value="toggle-active" />
							<input type="hidden" name="id" value={s.id} />
							<input type="hidden" name="isActive" value={String(!s.isActive)} />
							<Tag
								severity={s.isActive ? "success" : "warning"}
								value={s.isActive ? "Active" : "Inactive"}
								className="cursor-pointer"
								onClick={(e) => { (e.currentTarget.closest("form"))?.requestSubmit() }}
							/>
						</Form>
					)}
				/>
				<Column
					header="Actions"
					body={(s: (typeof semesters)[number]) => (
						<Form method="post" style={{ display: "inline" }}>
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
						</Form>
					)}
				/>
			</DataTable>
		</div>
	)
}
