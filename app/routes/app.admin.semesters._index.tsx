import { data } from "react-router"
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

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
					Semester Management
				</h1>
				<a
					href="/admin/semesters/new"
					className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
				>
					<i className="pi pi-plus mr-2" />
					New Semester
				</a>
			</div>

			<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-surface-50 dark:bg-surface-900">
							{["Name", "Year", "Period", "Start", "End", "Active", "Actions"].map((h) => (
								<th key={h} className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{semesters.map((s) => (
							<tr key={s.id} className="border-t border-surface-100 dark:border-surface-800">
								<td className="px-4 py-3 font-medium">{s.name}</td>
								<td className="px-4 py-3">{s.year}</td>
								<td className="px-4 py-3">{s.period === "summer" ? "Summer" : `Semester ${s.period}`}</td>
								<td className="px-4 py-3 text-surface-500">{s.startDate}</td>
								<td className="px-4 py-3 text-surface-500">{s.endDate}</td>
								<td className="px-4 py-3">
									<form method="post" className="inline">
										<input type="hidden" name="intent" value="toggle-active" />
										<input type="hidden" name="id" value={s.id} />
										<input type="hidden" name="isActive" value={String(!s.isActive)} />
										<button
											type="submit"
											className={`text-xs px-2 py-1 rounded ${s.isActive ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}
										>
											{s.isActive ? "Active" : "Inactive"}
										</button>
									</form>
								</td>
								<td className="px-4 py-3">
									<form method="post" className="inline">
										<input type="hidden" name="intent" value="delete" />
										<input type="hidden" name="id" value={s.id} />
										<button
											type="submit"
											className="text-red-500 hover:text-red-700 text-xs"
											onClick={(e) => {
												if (!confirm(`Delete ${s.name}?`)) e.preventDefault()
											}}
										>
											Delete
										</button>
									</form>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
