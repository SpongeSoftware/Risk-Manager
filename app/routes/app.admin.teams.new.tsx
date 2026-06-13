import { useState } from "react"
import { data, redirect } from "react-router"
import { useNavigate } from "react-router"
import { InputText } from "primereact/inputtext"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Message } from "primereact/message"
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
	const navigate = useNavigate()

	const semesterOptions = semesters.map((s) => ({
		label: `${s.name} ${s.year} (Semester ${s.period})`,
		value: String(s.id),
	}))
	const [semesterId, setSemesterId] = useState(semesterOptions[0]?.value ?? "")

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
					<InputText name="name" required className="w-full" />
					{errors?.name && <Message severity="error" text={errors.name[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Semester
					</label>
					<input type="hidden" name="semesterId" value={semesterId} />
					<Dropdown
						value={semesterId}
						onChange={(e) => setSemesterId(e.value)}
						options={semesterOptions}
						className="w-full"
						emptyMessage="No active semesters"
					/>
					{errors?.semesterId && <Message severity="error" text={errors.semesterId[0]} className="w-full mt-1" />}
				</div>

				<div className="flex gap-3 pt-2">
					<Button type="submit" label="Create Team" icon="pi pi-check" />
					<Button
						type="button"
						label="Cancel"
						outlined
						severity="secondary"
						onClick={() => navigate("/admin/teams")}
					/>
				</div>
			</form>
		</div>
	)
}
