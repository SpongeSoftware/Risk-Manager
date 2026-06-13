import { useState } from "react"
import { data, redirect } from "react-router"
import { useNavigate } from "react-router"
import { InputText } from "primereact/inputtext"
import { InputNumber } from "primereact/inputnumber"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Message } from "primereact/message"
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

const periodOptions = [
	{ label: "Semester 1", value: "1" },
	{ label: "Semester 2", value: "2" },
	{ label: "Summer", value: "summer" },
]

export default function NewSemesterPage({ actionData }: Route.ComponentProps) {
	const errors = actionData?.errors
	const navigate = useNavigate()
	const [year, setYear] = useState<number>(new Date().getFullYear())
	const [period, setPeriod] = useState("1")

	return (
		<div className="max-w-xl">
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				Create Semester
			</h1>
			<form method="post" className="space-y-4 bg-surface-0 dark:bg-surface-800 p-6 rounded-xl border border-surface-200 dark:border-surface-700">
				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Semester Name
					</label>
					<InputText name="name" required className="w-full" />
					{errors?.name && <Message severity="error" text={errors.name[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Year
					</label>
					<input type="hidden" name="year" value={year} />
					<InputNumber
						value={year}
						onValueChange={(e) => setYear(e.value ?? new Date().getFullYear())}
						useGrouping={false}
						className="w-full"
					/>
					{errors?.year && <Message severity="error" text={errors.year[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Period
					</label>
					<input type="hidden" name="period" value={period} />
					<Dropdown
						value={period}
						onChange={(e) => setPeriod(e.value)}
						options={periodOptions}
						className="w-full"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						Start Date
					</label>
					<InputText name="startDate" type="date" required className="w-full" />
					{errors?.startDate && <Message severity="error" text={errors.startDate[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
						End Date
					</label>
					<InputText name="endDate" type="date" required className="w-full" />
					{errors?.endDate && <Message severity="error" text={errors.endDate[0]} className="w-full mt-1" />}
				</div>

				<div className="flex gap-3 pt-2">
					<Button type="submit" label="Create Semester" icon="pi pi-check" />
					<Button
						type="button"
						label="Cancel"
						outlined
						severity="secondary"
						onClick={() => navigate("/admin/semesters")}
					/>
				</div>
			</form>
		</div>
	)
}
