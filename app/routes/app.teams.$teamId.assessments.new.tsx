import { data, redirect } from "react-router"
import type { Route } from "./+types/app.teams.$teamId.assessments.new"
import { requireUser } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamById, createAssessment } from "../server/queries"
import { createAssessmentSchema } from "../lib/schemas/assessment"
import { appendAudit } from "../server/queries/audits"

export async function loader({ request, params }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const teamId = Number(params.teamId)
	const team = await getTeamById(teamId)
	if (!team) throw data("Team not found", { status: 404 })
	if (!team.semester.isActive) throw data("Semester is no longer active", { status: 403 })
	if (!hasRole(user.role, Role.Admin) && !hasRole(user.role, Role.Supervisor)) {
		throw data("Access denied", { status: 403 })
	}
	return { team, user }
}

export async function action({ request, params }: Route.ActionArgs) {
	const user = await requireUser(request)
	const teamId = Number(params.teamId)
	const team = await getTeamById(teamId)
	if (!team?.semester.isActive) throw data("Semester is no longer active", { status: 403 })

	const formData = await request.formData()
	const parsed = createAssessmentSchema.safeParse(Object.fromEntries(formData))
	if (!parsed.success) {
		return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
	}

	const assessment = await createAssessment({
		teamId,
		title: parsed.data.title,
		framework: parsed.data.framework,
		createdBy: user.id,
		modifiedBy: user.id,
	})

	await appendAudit("assessment", assessment.id, "created", user.id)
	throw redirect(`/teams/${teamId}/assessments/${assessment.id}`)
}

export default function NewAssessmentPage({ loaderData, actionData }: Route.ComponentProps) {
	const { team } = loaderData
	const errors = actionData?.errors

	return (
		<div className="max-w-xl">
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				New Risk Assessment — {team.name}
			</h1>
			<form method="post" className="space-y-4 bg-surface-0 dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700">
				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Title
					</label>
					<input
						name="title"
						type="text"
						className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0"
						required
					/>
					{errors?.title && <p className="text-red-500 text-sm mt-1">{errors.title[0]}</p>}
				</div>
				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Framework
					</label>
					<select
						name="framework"
						className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0"
					>
						<option value="ISO27001">ISO 27001</option>
						<option value="SOC2">SOC 2</option>
						<option value="BOTH">Both</option>
					</select>
				</div>
				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						className="py-2 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
					>
						Create Assessment
					</button>
					<a
						href={`/teams/${team.id}`}
						className="py-2 px-6 border border-surface-300 dark:border-surface-600 rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
					>
						Cancel
					</a>
				</div>
			</form>
		</div>
	)
}
