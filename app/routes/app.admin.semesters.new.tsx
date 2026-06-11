import { data, redirect } from "react-router"
import type { Route } from "./+types/app.admin.semesters.new"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { createSemester } from "../server/queries"
import { createSemesterSchema } from "../lib/schemas/semester"
import { appendAudit } from "../server/queries/audits"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	const actor = await requireRole(request, Role.Admin)
	const formData = await request.formData()
	const parsed = createSemesterSchema.safeParse(Object.fromEntries(formData))
	if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

	const semester = await createSemester({
		...parsed.data,
		createdBy: actor.id,
		modifiedBy: actor.id,
	})
	await appendAudit("semester", semester.id, "created", actor.id)
	throw redirect("/admin/semesters")
}

export default function NewSemesterPage({ actionData }: Route.ComponentProps) {
	const errors = actionData?.errors

	return (
		<div className="max-w-xl">
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				Create Semester
			</h1>
			<form method="post" className="space-y-4 bg-surface-0 dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700">
				{[
					{ name: "name", label: "Semester Name", type: "text" },
					{ name: "year", label: "Year", type: "number" },
					{ name: "startDate", label: "Start Date", type: "date" },
					{ name: "endDate", label: "End Date", type: "date" },
				].map((f) => (
					<div key={f.name}>
						<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
							{f.label}
						</label>
						<input
							name={f.name}
							type={f.type}
							required
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0"
						/>
						{errors?.[f.name as keyof typeof errors] && (
							<p className="text-red-500 text-sm mt-1">{(errors[f.name as keyof typeof errors] as string[])[0]}</p>
						)}
					</div>
				))}
				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Period
					</label>
					<select
						name="period"
						className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0"
					>
						<option value="1">Semester 1</option>
						<option value="2">Semester 2</option>
						<option value="summer">Summer</option>
					</select>
				</div>
				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						className="py-2 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
					>
						Create Semester
					</button>
					<a
						href="/admin/semesters"
						className="py-2 px-6 border border-surface-300 dark:border-surface-600 rounded-lg text-surface-700 dark:text-surface-300"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>
	)
}
