import { useState } from "react"
import { data, redirect, useNavigate } from "react-router"
import { InputText } from "primereact/inputtext"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Message } from "primereact/message"
import type { Route } from "./+types/app.teams.$teamId.assessments.new"
import { requireUser, requireUserLoader } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamById, createAssessment } from "../server/queries"
import { z } from "zod/v4"
import { createAssessmentSchema } from "../lib/schemas/assessment"
import { appendAudit } from "../server/queries/audits"

export async function loader(args: Route.LoaderArgs) {
	return requireUserLoader(args, async (user) => {
		const teamId = Number(args.params.teamId)
		const team = await getTeamById(teamId)
		if (!team) throw data("Team not found", { status: 404 })
		if (!team.semester.isActive) throw data("Semester is no longer active", { status: 403 })
		if (!hasRole(user.role, Role.Admin) && !hasRole(user.role, Role.Supervisor)) {
			throw data("Access denied", { status: 403 })
		}
		return { team, user }
	})
}

export async function action({ request, params }: Route.ActionArgs) {
	const user = await requireUser(request)
	const teamId = Number(params.teamId)
	const team = await getTeamById(teamId)
	if (!team?.semester.isActive) throw data("Semester is no longer active", { status: 403 })

	const formData = await request.formData()
	const parsed = createAssessmentSchema.safeParse(Object.fromEntries(formData))
	if (!parsed.success) {
		return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })
	}

	const assessment = await createAssessment({
		teamId,
		title: parsed.data.title,
		framework: parsed.data.framework,
		createdBy: user.id,
		modifiedBy: user.id,
	})

	await appendAudit("assessment", assessment.id, "created", user.id, {
		newValue: JSON.stringify(assessment),
	})
	throw redirect(`/teams/${teamId}/assessments/${assessment.id}?toastSeverity=success&toastSummary=Assessment+created`)
}

const frameworkOptions = [
	{ label: "ISO 27001", value: "ISO27001" },
	{ label: "SOC 2", value: "SOC2" },
	{ label: "Both", value: "BOTH" },
]

export default function NewAssessmentPage({ loaderData, actionData }: Route.ComponentProps) {
	const { team } = loaderData
	const errors = actionData?.errors
	const navigate = useNavigate()
	const [framework, setFramework] = useState("ISO27001")

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
					<InputText name="title" required className="w-full" />
					{errors?.title && <Message severity="error" text={errors.title[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Framework
					</label>
					<input type="hidden" name="framework" value={framework} />
					<Dropdown
						value={framework}
						onChange={(e) => { setFramework(e.value as string) }}
						options={frameworkOptions}
						className="w-full"
					/>
				</div>

				<div className="flex gap-3 pt-2">
					<Button type="submit" label="Create Assessment" icon="pi pi-check" />
					<Button
						type="button"
						label="Cancel"
						outlined
						severity="secondary"
						onClick={() => navigate(`/teams/${team.id}`)}
					/>
				</div>
			</form>
		</div>
	)
}
