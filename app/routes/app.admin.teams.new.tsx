import { data, redirect } from "react-router"
import type { Route } from "./+types/app.admin.teams.new"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { getActiveSemesters, createTeam } from "../server/queries"
import { createTeamSchema } from "../lib/schemas/team"
import { appendAudit } from "../server/queries/audits"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	const semesters = await getActiveSemesters()
	return { semesters }
}

export async function action({ request }: Route.ActionArgs) {
	const actor = await requireRole(request, Role.Admin)
	const formData = await request.formData()
	const parsed = createTeamSchema.safeParse(Object.fromEntries(formData))
	if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

	const team = await createTeam({
		name: parsed.data.name,
		semesterId: parsed.data.semesterId,
		createdBy: actor.id,
		modifiedBy: actor.id,
	})
	await appendAudit("team", team.id, "created", actor.id)
	throw redirect(`/teams/${team.id}/members`)
}

export default function NewTeamPage({ loaderData, actionData }: Route.ComponentProps) {
	const { semesters } = loaderData
	const errors = actionData?.errors

	return (
		<div className="max-w-xl">
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				Create New Team
			</h1>
			<form method="post" className="space-y-4 bg-surface-0 dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700">
				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Team Name
					</label>
					<input
						name="name"
						type="text"
						required
						className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0"
					/>
					{errors?.name && <p className="text-red-500 text-sm mt-1">{errors.name[0]}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Semester
					</label>
					<select
						name="semesterId"
						className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0"
					>
						{semesters.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name} {s.year} (Semester {s.period})
							</option>
						))}
					</select>
					{errors?.semesterId && <p className="text-red-500 text-sm mt-1">{errors.semesterId[0]}</p>}
				</div>
				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						className="py-2 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
					>
						Create Team
					</button>
					<a
						href="/admin/teams"
						className="py-2 px-6 border border-surface-300 dark:border-surface-600 rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>
	)
}
