import { useState } from "react"
import { data, redirect, Form } from "react-router"
import { useNavigate } from "react-router"
import type { Route } from "./+types/app.admin.semesters.new"

import { InputText } from "primereact/inputtext"
import { InputNumber } from "primereact/inputnumber"
import { Dropdown } from "primereact/dropdown"
import { Calendar } from "primereact/calendar"
import { Button } from "primereact/button"
import { Message } from "primereact/message"
import { Card } from "primereact/card"
import { requireRole, requireRoleLoader } from "../server/auth"
import { Role } from "../server/schema"
import { createSemester } from "../server/queries"
import { z } from "zod/v4"
import { createSemesterSchema } from "../lib/schemas/semester"
import { appendAudit } from "../server/queries/audits"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — New Semester" }]

export async function loader(args: Route.LoaderArgs) {
	return requireRoleLoader(args, Role.Admin, () => ({}))
}

export async function action({ request }: Route.ActionArgs) {
	const actor = await requireRole(request, Role.Admin)
	const formData = await request.formData()
	const parsed = createSemesterSchema.safeParse(Object.fromEntries(formData))
	if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })

	const semester = await createSemester({
		...parsed.data,
		createdBy: actor.id,
		modifiedBy: actor.id,
	})
	await appendAudit("semester", semester.id, "created", actor.id, {
		newValue: JSON.stringify(semester),
	})
	throw redirect("/admin/semesters?toastSeverity=success&toastSummary=Semester+created")
}

const periodOptions = [
	{ label: "Semester 1", value: "1" },
	{ label: "Semester 2", value: "2" },
	{ label: "Summer", value: "summer" },
]

function toIsoDate(d: Date | null | undefined): string {
	if (!d) return ""
	return d.toISOString().slice(0, 10)
}

export default function NewSemesterPage({ actionData }: Route.ComponentProps) {
	const errors = actionData?.errors
	const navigate = useNavigate()
	const [year, setYear] = useState<number>(new Date().getFullYear())
	const [period, setPeriod] = useState("1")
	const [startDate, setStartDate] = useState<Date | null>(null)
	const [endDate, setEndDate] = useState<Date | null>(null)

	return (
		<div className="max-w-xl">
			<h1 className="text-2xl font-bold mb-6">Create Semester</h1>
			<Card>
				<Form method="post" className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
							Semester Name
						</label>
						<InputText name="name" required className="w-full" />
						{errors?.name && <Message severity="error" text={errors.name[0]} className="w-full mt-1" />}
					</div>

					<div>
						<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
							Year
						</label>
						<input type="hidden" name="year" value={year} />
						<InputNumber
							value={year}
							onValueChange={(e) => { setYear((e.value as number | null) ?? new Date().getFullYear()) }}
							useGrouping={false}
							className="w-full"
						/>
						{errors?.year && <Message severity="error" text={errors.year[0]} className="w-full mt-1" />}
					</div>

					<div>
						<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
							Period
						</label>
						<input type="hidden" name="period" value={period} />
						<Dropdown
							value={period}
							onChange={(e) => { setPeriod(e.value as string) }}
							options={periodOptions}
							className="w-full"
						/>
					</div>

					<div>
						<label htmlFor="startDate" className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
							Start Date
						</label>
						<input type="hidden" name="startDate" value={toIsoDate(startDate)} />
						<Calendar
							inputId="startDate"
							value={startDate}
							onChange={(e) => { setStartDate(e.value ?? null) }}
							dateFormat="dd/mm/yy"
							showIcon
							className="w-full"
						/>
						{errors?.startDate && <Message severity="error" text={errors.startDate[0]} className="w-full mt-1" />}
					</div>

					<div>
						<label htmlFor="endDate" className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
							End Date
						</label>
						<input type="hidden" name="endDate" value={toIsoDate(endDate)} />
						<Calendar
							inputId="endDate"
							value={endDate}
							onChange={(e) => { setEndDate(e.value ?? null) }}
							dateFormat="dd/mm/yy"
							showIcon
							className="w-full"
						/>
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
				</Form>
			</Card>
		</div>
	)
}
