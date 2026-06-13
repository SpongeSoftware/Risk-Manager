import { useState } from "react"
import { data } from "react-router"
import { InputText } from "primereact/inputtext"
import { InputNumber } from "primereact/inputnumber"
import { InputTextarea } from "primereact/inputtextarea"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Panel } from "primereact/panel"
import type { Route } from "./+types/app.teams.$teamId.assessments.$assessmentId"
import { requireUser } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import {
	getAssessmentById,
	getRiskItemsForAssessment,
	getFeedbackForAssessment,
	createRiskItem,
	createFeedback,
	updateAssessmentStatus,
	softDeleteRiskItem,
} from "../server/queries"
import { isUserInTeam } from "../server/queries/teams"
import { appendAudit } from "../server/queries/audits"
import { riskItemSchema } from "../lib/schemas/riskItem"
import { addFeedbackSchema, updateAssessmentStatusSchema } from "../lib/schemas/assessment"
import { riskLevel } from "../lib/formatters"

export async function loader({ request, params }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const assessmentId = Number(params.assessmentId)

	const assessment = await getAssessmentById(assessmentId)
	if (!assessment) throw data("Not found", { status: 404 })

	if (!hasRole(user.role, Role.Admin)) {
		const inTeam = await isUserInTeam(user.id, assessment.teamId)
		if (!inTeam) throw data("Access denied", { status: 403 })
	}

	const [riskItems, feedbackList] = await Promise.all([
		getRiskItemsForAssessment(assessmentId),
		getFeedbackForAssessment(assessmentId),
	])

	const isActive = assessment.team.semester.isActive
	const canEdit =
		isActive &&
		(hasRole(user.role, Role.Admin) || hasRole(user.role, Role.Supervisor))
	const canFeedback = hasRole(user.role, Role.Supervisor) || hasRole(user.role, Role.Admin)

	return { user, assessment, riskItems, feedbackList, isActive, canEdit, canFeedback }
}

export async function action({ request, params }: Route.ActionArgs) {
	const user = await requireUser(request)
	const assessmentId = Number(params.assessmentId)

	const assessment = await getAssessmentById(assessmentId)
	if (!assessment) throw data("Not found", { status: 404 })

	const formData = await request.formData()
	const intent = formData.get("intent") as string

	if (intent === "add-risk-item") {
		if (!assessment.team.semester.isActive) throw data("Semester inactive", { status: 403 })
		const parsed = riskItemSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

		const item = await createRiskItem({
			assessmentId,
			...parsed.data,
			createdBy: user.id,
			modifiedBy: user.id,
		})
		await appendAudit("risk_item", item.id, "created", user.id)
		return data({ ok: true })
	}

	if (intent === "add-feedback") {
		if (!hasRole(user.role, Role.Supervisor) && !hasRole(user.role, Role.Admin)) {
			throw data("Forbidden", { status: 403 })
		}
		const parsed = addFeedbackSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

		await createFeedback({
			assessmentId,
			supervisorId: user.id,
			comment: parsed.data.comment,
			createdBy: user.id,
			modifiedBy: user.id,
		})
		await appendAudit("feedback", assessmentId, "created", user.id, {
			newValue: parsed.data.comment,
		})
		return data({ ok: true })
	}

	if (intent === "update-status") {
		if (!hasRole(user.role, Role.Supervisor) && !hasRole(user.role, Role.Admin)) {
			throw data("Forbidden", { status: 403 })
		}
		const parsed = updateAssessmentStatusSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

		await updateAssessmentStatus(assessmentId, parsed.data.status, user.id)
		await appendAudit("assessment", assessmentId, "updated", user.id, {
			fieldChanged: "status",
			oldValue: assessment.status,
			newValue: parsed.data.status,
		})
		return data({ ok: true })
	}

	if (intent === "delete-risk-item") {
		if (!assessment.team.semester.isActive) throw data("Semester inactive", { status: 403 })
		const itemId = Number(formData.get("itemId"))
		await softDeleteRiskItem(itemId, user.id)
		await appendAudit("risk_item", itemId, "deleted", user.id)
		return data({ ok: true })
	}

	throw data("Unknown intent", { status: 400 })
}

const levelColors: Record<string, string> = {
	low: "text-green-600 dark:text-green-400",
	medium: "text-yellow-600 dark:text-yellow-400",
	high: "text-orange-600 dark:text-orange-400",
	critical: "text-red-600 dark:text-red-400",
}

const treatmentOptions = [
	{ label: "Mitigate — reduce the likelihood or impact", value: "mitigate" },
	{ label: "Accept — tolerate the risk as-is", value: "accept" },
	{ label: "Transfer — share via insurance or contract", value: "transfer" },
	{ label: "Avoid — eliminate the activity causing the risk", value: "avoid" },
]

function FieldLabel({ label, help }: { label: string; help: string }) {
	return (
		<div className="mb-1">
			<label className="block text-sm font-medium text-surface-600 dark:text-surface-400">
				{label}
			</label>
			<p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">{help}</p>
		</div>
	)
}

function AddRiskItemForm({ assessmentFramework }: { assessmentFramework: string }) {
	const showSoc2 = assessmentFramework === "SOC2" || assessmentFramework === "BOTH"
	const [treatment, setTreatment] = useState("mitigate")
	const [likelihood, setLikelihood] = useState<number>(3)
	const [impact, setImpact] = useState<number>(3)

	return (
		<Panel header="Add Risk Item" toggleable collapsed className="mt-6">
			<form method="post" className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<input type="hidden" name="intent" value="add-risk-item" />

				<div>
					<FieldLabel
						label="Asset Name"
						help="The specific resource being assessed — e.g. 'Customer database', 'Email server', 'Employee laptops'."
					/>
					<InputText name="assetName" required className="w-full" />
				</div>

				<div>
					<FieldLabel
						label="Asset Category"
						help="The type of asset — e.g. Hardware, Software, Data, People, Services, or Facilities."
					/>
					<InputText name="assetCategory" required className="w-full" />
				</div>

				<div>
					<FieldLabel
						label="Threat"
						help="An event or action that could harm the asset — e.g. 'Ransomware attack', 'Unauthorised access', 'Hardware failure'."
					/>
					<InputText name="threat" required className="w-full" />
				</div>

				<div>
					<FieldLabel
						label="Vulnerability"
						help="A weakness the threat could exploit — e.g. 'Unpatched software', 'Weak password policy', 'No off-site backup'."
					/>
					<InputText name="vulnerability" required className="w-full" />
				</div>

				<div>
					<FieldLabel
						label="Likelihood (1–5)"
						help="How probable the threat is: 1 = Rare, 2 = Unlikely, 3 = Possible, 4 = Likely, 5 = Almost Certain."
					/>
					<input type="hidden" name="likelihood" value={likelihood} />
					<InputNumber
						value={likelihood}
						onValueChange={(e) => setLikelihood(e.value ?? 3)}
						min={1}
						max={5}
						showButtons
						buttonLayout="horizontal"
						decrementButtonClassName="p-button-secondary"
						incrementButtonClassName="p-button-secondary"
						className="w-full"
					/>
				</div>

				<div>
					<FieldLabel
						label="Impact (1–5)"
						help="Severity of harm if the threat occurs: 1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Catastrophic."
					/>
					<input type="hidden" name="impact" value={impact} />
					<InputNumber
						value={impact}
						onValueChange={(e) => setImpact(e.value ?? 3)}
						min={1}
						max={5}
						showButtons
						buttonLayout="horizontal"
						decrementButtonClassName="p-button-secondary"
						incrementButtonClassName="p-button-secondary"
						className="w-full"
					/>
				</div>

				<div>
					<FieldLabel
						label="Treatment"
						help="How you will respond to this risk — choose the strategy that best fits the context."
					/>
					<input type="hidden" name="treatment" value={treatment} />
					<Dropdown
						value={treatment}
						onChange={(e) => setTreatment(e.value)}
						options={treatmentOptions}
						className="w-full"
					/>
				</div>

				{showSoc2 && (
					<div>
						<FieldLabel
							label="SOC2 Criteria (optional)"
							help="The Trust Services Criteria this risk maps to — e.g. CC6.1 (logical access), CC7.2 (incident detection)."
						/>
						<InputText name="soc2Criteria" placeholder="e.g. CC6.1" className="w-full" />
					</div>
				)}

				<div className="md:col-span-2">
					<FieldLabel
						label="Controls (optional)"
						help="Existing or planned measures that reduce this risk — e.g. 'MFA enforced', 'Nightly encrypted backups', 'Annual security training'."
					/>
					<InputTextarea name="controls" rows={2} className="w-full" autoResize />
				</div>

				<div className="md:col-span-2">
					<Button type="submit" label="Add Risk Item" icon="pi pi-plus" />
				</div>
			</form>
		</Panel>
	)
}

export default function AssessmentDetailPage({ loaderData }: Route.ComponentProps) {
	const { user, assessment, riskItems, feedbackList, isActive, canEdit, canFeedback } = loaderData

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<a
						href={`/teams/${assessment.teamId}`}
						className="text-sm text-purple-600 dark:text-purple-400 hover:underline mb-1 block"
					>
						← Back to team
					</a>
					<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
						{assessment.title}
					</h1>
					<div className="flex gap-2 mt-1">
						<Tag value={assessment.framework} severity="info" />
						<Tag value={assessment.status} severity="secondary" />
						{!isActive && <Tag value="Read Only (Semester Inactive)" severity="danger" />}
					</div>
				</div>
			</div>

			{/* Risk Items */}
			<section className="mb-8">
				<h2 className="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">
					Risk Items ({riskItems.length})
				</h2>

				<DataTable value={riskItems} stripedRows emptyMessage="No risk items yet." className="text-sm">
					<Column field="assetName" header="Asset" />
					<Column field="threat" header="Threat" />
					<Column field="likelihood" header="L" />
					<Column field="impact" header="I" />
					<Column
						header="Score"
						body={(item) => {
							const level = riskLevel(item.riskScore)
							return <span className={`font-bold ${levelColors[level]}`}>{item.riskScore}</span>
						}}
					/>
					<Column
						header="Treatment"
						body={(item) => <span className="capitalize">{item.treatment}</span>}
					/>
					{canEdit && (
						<Column
							header=""
							body={(item) => (
								<form method="post" style={{ display: "inline" }}>
									<input type="hidden" name="intent" value="delete-risk-item" />
									<input type="hidden" name="itemId" value={item.id} />
									<Button
										type="submit"
										icon="pi pi-trash"
										severity="danger"
										text
										size="small"
										onClick={(e) => {
											if (!confirm("Delete this risk item?")) e.preventDefault()
										}}
									/>
								</form>
							)}
						/>
					)}
				</DataTable>

				{canEdit && <AddRiskItemForm assessmentFramework={assessment.framework} />}
			</section>

			{/* Feedback */}
			{canFeedback && (
				<section className="mb-8">
					<h2 className="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">
						Feedback
					</h2>
					<div className="space-y-3 mb-4">
						{feedbackList.map((f) => (
							<div
								key={f.id}
								className="p-4 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700"
							>
								<p className="text-sm text-surface-900 dark:text-surface-0">{f.comment}</p>
								<p className="text-xs text-surface-500 mt-1">{f.supervisor.fullName}</p>
							</div>
						))}
					</div>
					{(hasRole(user.role, Role.Supervisor) || hasRole(user.role, Role.Admin)) && (
						<form method="post" className="flex gap-3">
							<input type="hidden" name="intent" value="add-feedback" />
							<InputTextarea
								name="comment"
								rows={3}
								placeholder="Leave feedback..."
								required
								className="flex-1"
								autoResize
							/>
							<Button
								type="submit"
								label="Submit"
								icon="pi pi-send"
								className="self-end"
							/>
						</form>
					)}
				</section>
			)}
		</div>
	)
}
