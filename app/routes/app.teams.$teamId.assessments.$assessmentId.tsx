import { useState, useEffect, Suspense } from "react"
import { data, Form, Link, Await, useFetcher } from "react-router"
import { useActionToast } from "../hooks/useActionToast"
import { useFlashToast } from "../hooks/useFlashToast"
import { FilterMatchMode } from "primereact/api"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import { InputText } from "primereact/inputtext"
import { InputNumber } from "primereact/inputnumber"
import { InputTextarea } from "primereact/inputtextarea"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import { Message } from "primereact/message"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Panel } from "primereact/panel"
import { Dialog } from "primereact/dialog"
import { Skeleton } from "primereact/skeleton"
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog"
import type { Route } from "./+types/app.teams.$teamId.assessments.$assessmentId"
import { requireUser, requireUserLoader } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import {
	getAssessmentById,
	getRiskItemsForAssessment,
	getRiskItemById,
	getFeedbackForAssessment,
	createRiskItem,
	createFeedback,
	updateAssessmentStatus,
	softDeleteRiskItem,
	updateRiskItem,
} from "../server/queries"
import { isUserInTeam } from "../server/queries/teams"
import { appendAudit } from "../server/queries/audits"
import { z } from "zod/v4"
import { riskItemSchema } from "../lib/schemas/riskItem"
import { addFeedbackSchema, updateAssessmentStatusSchema } from "../lib/schemas/assessment"
import { riskLevel } from "../lib/formatters"
import { AssessmentStatusTag } from "../components/domain/AssessmentStatusTag"
import { RiskMatrix } from "../components/domain/RiskMatrix"

export async function loader(args: Route.LoaderArgs) {
	return requireUserLoader(args, async (user) => {
		const assessmentId = Number(args.params.assessmentId)

		const assessment = await getAssessmentById(assessmentId)
		if (!assessment) throw data("Not found", { status: 404 })

		if (!hasRole(user.role, Role.Admin)) {
			const inTeam = await isUserInTeam(user.id, assessment.teamId)
			if (!inTeam) throw data("Access denied", { status: 403 })
		}

		const isActive = assessment.team.semester.isActive
		const isSupervisorOrAdmin = hasRole(user.role, Role.Admin) || hasRole(user.role, Role.Supervisor)
		const canEdit = isActive && (isSupervisorOrAdmin || assessment.status === "draft")
		const canAdvanceStatus = isActive && isSupervisorOrAdmin
		const canFeedback = hasRole(user.role, Role.Supervisor) || hasRole(user.role, Role.Admin)

		return {
			user,
			assessment,
			isActive,
			canEdit,
			canAdvanceStatus,
			canFeedback,
			riskItems: getRiskItemsForAssessment(assessmentId),
			feedbackList: getFeedbackForAssessment(assessmentId),
		}
	})
}

export async function action({ request, params }: Route.ActionArgs) {
	const user = await requireUser(request)
	const assessmentId = Number(params.assessmentId)

	const assessment = await getAssessmentById(assessmentId)
	if (!assessment) throw data("Not found", { status: 404 })

	const formData = await request.formData()
	const intent = formData.get("intent") as string

	const isSupervisorOrAdmin = hasRole(user.role, Role.Admin) || hasRole(user.role, Role.Supervisor)
	const isDraft = assessment.status === "draft"

	if (intent === "add-risk-item") {
		if (!assessment.team.semester.isActive) throw data("Semester inactive", { status: 403 })
		if (!isSupervisorOrAdmin && !isDraft) throw data("Assessment is no longer in draft", { status: 403 })
		const parsed = riskItemSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })

		const item = await createRiskItem({
			assessmentId,
			...parsed.data,
			createdBy: user.id,
			modifiedBy: user.id,
		})
		await appendAudit("risk_item", item.id, "created", user.id, {
			newValue: JSON.stringify(item),
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Risk item added" } })
	}

	if (intent === "edit-risk-item") {
		if (!assessment.team.semester.isActive) throw data("Semester inactive", { status: 403 })
		if (!isSupervisorOrAdmin && !isDraft) throw data("Assessment is no longer in draft", { status: 403 })
		const itemId = Number(formData.get("itemId"))
		const parsed = riskItemSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })
		await updateRiskItem(itemId, parsed.data, user.id)
		await appendAudit("risk_item", itemId, "updated", user.id)
		return data({ ok: true, toast: { severity: "success" as const, summary: "Risk item updated" } })
	}

	if (intent === "add-feedback") {
		if (!hasRole(user.role, Role.Supervisor) && !hasRole(user.role, Role.Admin)) {
			throw data("Forbidden", { status: 403 })
		}
		const parsed = addFeedbackSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })

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
		return data({ ok: true, toast: { severity: "success" as const, summary: "Feedback added" } })
	}

	if (intent === "submit-for-review") {
		if (!assessment.team.semester.isActive) throw data("Semester inactive", { status: 403 })
		if (assessment.status !== "draft") throw data("Can only submit draft assessments", { status: 400 })
		await updateAssessmentStatus(assessmentId, "submitted", user.id)
		await appendAudit("assessment", assessmentId, "updated", user.id, {
			fieldChanged: "status",
			oldValue: "draft",
			newValue: "submitted",
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Assessment submitted for review" } })
	}

	if (intent === "update-status") {
		if (!hasRole(user.role, Role.Supervisor) && !hasRole(user.role, Role.Admin)) {
			throw data("Forbidden", { status: 403 })
		}
		const parsed = updateAssessmentStatusSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })

		await updateAssessmentStatus(assessmentId, parsed.data.status, user.id)
		await appendAudit("assessment", assessmentId, "updated", user.id, {
			fieldChanged: "status",
			oldValue: assessment.status,
			newValue: parsed.data.status,
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Status updated" } })
	}

	if (intent === "delete-risk-item") {
		if (!assessment.team.semester.isActive) throw data("Semester inactive", { status: 403 })
		if (!isSupervisorOrAdmin && !isDraft) throw data("Assessment is no longer in draft", { status: 403 })
		const itemId = Number(formData.get("itemId"))
		const existingItem = await getRiskItemById(itemId)
		await softDeleteRiskItem(itemId, user.id)
		await appendAudit("risk_item", itemId, "deleted", user.id, {
			oldValue: existingItem ? JSON.stringify(existingItem) : undefined,
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Risk item deleted" } })
	}

	throw data("Unknown intent", { status: 400 })
}

const levelStyles: Record<string, React.CSSProperties> = {
	low:      { color: "var(--green-500)" },
	medium:   { color: "var(--yellow-500)" },
	high:     { color: "var(--orange-500)" },
	critical: { color: "var(--red-500)" },
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
			<label className="block text-sm font-medium" style={{ color: "var(--text-color-secondary)" }}>
				{label}
			</label>
			<p className="text-xs mt-0.5" style={{ color: "var(--text-color-secondary)", opacity: 0.7 }}>{help}</p>
		</div>
	)
}

type RiskItem = Awaited<ReturnType<typeof getRiskItemsForAssessment>>[number]
type FeedbackItem = Awaited<ReturnType<typeof getFeedbackForAssessment>>[number]
type FieldErrors = Record<string, string[] | undefined>

function RiskItemFields({
	assessmentFramework,
	defaults,
	errors,
}: {
	assessmentFramework: string
	defaults?: Partial<RiskItem>
	errors?: FieldErrors
}) {
	const showSoc2 = assessmentFramework === "SOC2" || assessmentFramework === "BOTH"
	const [treatment, setTreatment] = useState(defaults?.treatment ?? "mitigate")
	const [likelihood, setLikelihood] = useState<number>(defaults?.likelihood ?? 3)
	const [impact, setImpact] = useState<number>(defaults?.impact ?? 3)

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<FieldLabel
					label="Asset Name"
					help="The specific resource being assessed — e.g. 'Customer database', 'Email server', 'Employee laptops'."
				/>
				<InputText name="assetName" required className="w-full" defaultValue={defaults?.assetName ?? ""} />
				{errors?.assetName && <Message severity="error" text={errors.assetName[0]} className="w-full mt-1" />}
			</div>

			<div>
				<FieldLabel
					label="Asset Category"
					help="The type of asset — e.g. Hardware, Software, Data, People, Services, or Facilities."
				/>
				<InputText name="assetCategory" required className="w-full" defaultValue={defaults?.assetCategory ?? ""} />
				{errors?.assetCategory && <Message severity="error" text={errors.assetCategory[0]} className="w-full mt-1" />}
			</div>

			<div>
				<FieldLabel
					label="Threat"
					help="An event or action that could harm the asset — e.g. 'Ransomware attack', 'Unauthorised access', 'Hardware failure'."
				/>
				<InputText name="threat" required className="w-full" defaultValue={defaults?.threat ?? ""} />
				{errors?.threat && <Message severity="error" text={errors.threat[0]} className="w-full mt-1" />}
			</div>

			<div>
				<FieldLabel
					label="Vulnerability"
					help="A weakness the threat could exploit — e.g. 'Unpatched software', 'Weak password policy', 'No off-site backup'."
				/>
				<InputText name="vulnerability" required className="w-full" defaultValue={defaults?.vulnerability ?? ""} />
				{errors?.vulnerability && <Message severity="error" text={errors.vulnerability[0]} className="w-full mt-1" />}
			</div>

			<div>
				<FieldLabel
					label="Likelihood (1–5)"
					help="How probable the threat is: 1 = Rare, 2 = Unlikely, 3 = Possible, 4 = Likely, 5 = Almost Certain."
				/>
				<input type="hidden" name="likelihood" value={likelihood} />
				<InputNumber
					value={likelihood}
					onValueChange={(e) => { setLikelihood((e.value as number | null) ?? 3) }}
					min={1}
					max={5}
					showButtons
					buttonLayout="horizontal"
					decrementButtonClassName="p-button-secondary"
					incrementButtonClassName="p-button-secondary"
					className="w-full"
				/>
				{errors?.likelihood && <Message severity="error" text={errors.likelihood[0]} className="w-full mt-1" />}
			</div>

			<div>
				<FieldLabel
					label="Impact (1–5)"
					help="Severity of harm if the threat occurs: 1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Catastrophic."
				/>
				<input type="hidden" name="impact" value={impact} />
				<InputNumber
					value={impact}
					onValueChange={(e) => { setImpact((e.value as number | null) ?? 3) }}
					min={1}
					max={5}
					showButtons
					buttonLayout="horizontal"
					decrementButtonClassName="p-button-secondary"
					incrementButtonClassName="p-button-secondary"
					className="w-full"
				/>
				{errors?.impact && <Message severity="error" text={errors.impact[0]} className="w-full mt-1" />}
			</div>

			<div>
				<FieldLabel
					label="Treatment"
					help="How you will respond to this risk — choose the strategy that best fits the context."
				/>
				<input type="hidden" name="treatment" value={treatment} />
				<Dropdown
					value={treatment}
					onChange={(e) => { setTreatment(e.value as string) }}
					options={treatmentOptions}
					className="w-full"
				/>
				{errors?.treatment && <Message severity="error" text={errors.treatment[0]} className="w-full mt-1" />}
			</div>

			{showSoc2 && (
				<div>
					<FieldLabel
						label="SOC2 Criteria (optional)"
						help="The Trust Services Criteria this risk maps to — e.g. CC6.1 (logical access), CC7.2 (incident detection)."
					/>
					<InputText name="soc2Criteria" placeholder="e.g. CC6.1" className="w-full" defaultValue={defaults?.soc2Criteria ?? ""} />
				</div>
			)}

			<div className="md:col-span-2">
				<FieldLabel
					label="Controls (optional)"
					help="Existing or planned measures that reduce this risk — e.g. 'MFA enforced', 'Nightly encrypted backups', 'Annual security training'."
				/>
				<InputTextarea name="controls" rows={2} className="w-full" autoResize defaultValue={defaults?.controls ?? ""} />
			</div>
		</div>
	)
}

function AddRiskItemForm({
	assessmentFramework,
	errors,
}: {
	assessmentFramework: string
	errors?: FieldErrors
}) {
	return (
		<Panel header="Add Risk Item" toggleable collapsed className="mt-6">
			<Form method="post" className="grid grid-cols-1 gap-4">
				<input type="hidden" name="intent" value="add-risk-item" />
				<RiskItemFields assessmentFramework={assessmentFramework} errors={errors} />
				<div>
					<Button type="submit" label="Add Risk Item" icon="pi pi-plus" />
				</div>
			</Form>
		</Panel>
	)
}

function EditRiskItemDialog({
	item,
	assessmentFramework,
	onHide,
}: {
	item: RiskItem | null
	assessmentFramework: string
	onHide: () => void
}) {
	const fetcher = useFetcher()
	const fetcherData = fetcher.data as { errors?: FieldErrors } | undefined
	const fetcherErrors = fetcherData?.errors
	useActionToast(fetcher.data as Parameters<typeof useActionToast>[0])

	useEffect(() => {
		if (fetcher.data && (fetcher.data as { ok?: boolean }).ok) {
			onHide()
		}
	}, [fetcher.data, onHide])

	return (
		<Dialog
			visible={!!item}
			onHide={onHide}
			header="Edit Risk Item"
			style={{ width: "42rem" }}
			modal
			dismissableMask
		>
			{item && (
				<fetcher.Form method="post" className="grid grid-cols-1 gap-4 pt-2">
					<input type="hidden" name="intent" value="edit-risk-item" />
					<input type="hidden" name="itemId" value={item.id} />
					<RiskItemFields assessmentFramework={assessmentFramework} defaults={item} errors={fetcherErrors} />
					<div className="flex justify-end gap-2 pt-2">
						<Button type="button" label="Cancel" severity="secondary" outlined onClick={onHide} />
						<Button
							type="submit"
							label="Save Changes"
							icon="pi pi-check"
							loading={fetcher.state !== "idle"}
						/>
					</div>
				</fetcher.Form>
			)}
		</Dialog>
	)
}

function StatusActions({
	status,
	isActive,
	userRole,
}: {
	status: string
	isActive: boolean
	userRole: number
}) {
	if (!isActive) return null

	const isSupervisorOrAdmin = hasRole(userRole, Role.Supervisor) || hasRole(userRole, Role.Admin)
	const isStudentOnly = !isSupervisorOrAdmin

	if (isStudentOnly && status === "draft") {
		return (
			<Form method="post">
				<input type="hidden" name="intent" value="submit-for-review" />
				<Button type="submit" label="Submit for Review" icon="pi pi-send" size="small" />
			</Form>
		)
	}

	if (isSupervisorOrAdmin) {
		const next = status === "submitted" ? "reviewed" : status === "reviewed" ? "approved" : null
		if (!next) return null
		const labels: Record<string, string> = { reviewed: "Mark Reviewed", approved: "Mark Approved" }
		return (
			<Form method="post">
				<input type="hidden" name="intent" value="update-status" />
				<input type="hidden" name="status" value={next} />
				<Button
					type="submit"
					label={labels[next]}
					icon="pi pi-check"
					size="small"
					severity="success"
				/>
			</Form>
		)
	}

	return null
}

function RiskItemsSkeleton() {
	return (
		<div className="space-y-2">
			{[1, 2, 3, 4].map((i) => (
				<div
					key={i}
					className="flex gap-4 items-center p-3 border border-surface-200 dark:border-surface-700 rounded-lg"
				>
					<Skeleton width="8rem" height="1rem" />
					<Skeleton width="10rem" height="1rem" />
					<Skeleton width="1.5rem" height="1rem" />
					<Skeleton width="1.5rem" height="1rem" />
					<Skeleton width="3rem" height="1rem" />
					<Skeleton width="5rem" height="1rem" />
				</div>
			))}
		</div>
	)
}

function FeedbackSkeleton() {
	return (
		<div className="space-y-3 mb-4">
			{[1, 2].map((i) => (
				<div
					key={i}
					className="p-4 rounded-lg"
					style={{ background: "var(--surface-card)", border: "1px solid var(--surface-border)" }}
				>
					<Skeleton width="100%" height="1rem" className="mb-2" />
					<Skeleton width="6rem" height="0.875rem" />
				</div>
			))}
		</div>
	)
}

function RiskItemsSection({
	items,
	canEdit,
	assessmentFramework,
	errors,
}: {
	items: RiskItem[]
	canEdit: boolean
	assessmentFramework: string
	errors?: FieldErrors
}) {
	const [globalFilterValue, setGlobalFilterValue] = useState("")
	const [filters, setFilters] = useState({
		global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
	})
	const [editItem, setEditItem] = useState<RiskItem | null>(null)
	const deleteFetcher = useFetcher()

	function onGlobalFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value
		setFilters({ global: { value: value || null, matchMode: FilterMatchMode.CONTAINS } })
		setGlobalFilterValue(value)
	}

	const tableHeader = (
		<div className="flex justify-end">
			<IconField iconPosition="left">
				<InputIcon className="pi pi-search" />
				<InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search risk items..." />
			</IconField>
		</div>
	)

	return (
		<>
			{items.length > 0 && (
				<div className="mb-6">
					<RiskMatrix items={items} />
				</div>
			)}

			<DataTable
				value={items}
				stripedRows
				emptyMessage="No risk items yet."
				className="text-sm"
				paginator
				rows={10}
				rowsPerPageOptions={[5, 10, 25]}
				filters={filters}
				globalFilterFields={["assetName", "threat", "treatment"]}
				header={tableHeader}
				sortMode="single"
				removableSort
			>
				<Column field="assetName" header="Asset" sortable />
				<Column field="threat" header="Threat" sortable />
				<Column field="likelihood" header="L" sortable />
				<Column field="impact" header="I" sortable />
				<Column
					header="Score"
					field="riskScore"
					sortable
					body={(item: RiskItem) => {
						const level = riskLevel(item.riskScore)
						return <span className="font-bold" style={levelStyles[level]}>{item.riskScore}</span>
					}}
				/>
				<Column
					header="Treatment"
					field="treatment"
					sortable
					body={(item: RiskItem) => <span className="capitalize">{item.treatment}</span>}
				/>
				{canEdit && (
					<Column
						header=""
						body={(item: RiskItem) => (
							<div className="flex gap-1">
								<Button
									icon="pi pi-pencil"
									severity="secondary"
									text
									size="small"
									onClick={() => { setEditItem(item) }}
								/>
								<Button
									icon="pi pi-trash"
									severity="danger"
									text
									size="small"
									onClick={() => confirmDialog({
										message: `Delete "${item.assetName}"?`,
										header: "Confirm Deletion",
										icon: "pi pi-exclamation-triangle",
										acceptClassName: "p-button-danger",
										accept: () => { void deleteFetcher.submit(
											{ intent: "delete-risk-item", itemId: item.id },
											{ method: "post" }
										) },
									})}
								/>
							</div>
						)}
					/>
				)}
			</DataTable>

			{canEdit && (
				<AddRiskItemForm assessmentFramework={assessmentFramework} errors={errors} />
			)}

			<EditRiskItemDialog
				key={editItem?.id ?? "none"}
				item={editItem}
				assessmentFramework={assessmentFramework}
				onHide={() => { setEditItem(null) }}
			/>
		</>
	)
}

export default function AssessmentDetailPage({ loaderData, actionData }: Route.ComponentProps) {
	const { user, assessment, riskItems, feedbackList, isActive, canEdit, canFeedback } = loaderData
	useActionToast(actionData as Parameters<typeof useActionToast>[0])
	useFlashToast()

	const errors: FieldErrors | undefined = actionData && "errors" in actionData
		? actionData.errors
		: undefined

	return (
		<div>
			<ConfirmDialog />
			<div className="flex items-center justify-between mb-6">
				<div>
					<Link
						to={`/teams/${assessment.teamId}`}
						viewTransition
						className="text-sm hover:underline mb-1 block"
						style={{ color: "var(--primary-color)" }}
					>
						← Back to team
					</Link>
					<h1 className="text-2xl font-bold">
						{assessment.title}
					</h1>
					<div className="flex gap-2 mt-1">
						<Tag value={assessment.framework} severity="info" />
						<AssessmentStatusTag status={assessment.status} />
						{!isActive && <Tag value="Read Only (Semester Inactive)" severity="danger" />}
					</div>
				</div>
				<StatusActions status={assessment.status} isActive={isActive} userRole={user.role} />
			</div>

			{/* Risk Items */}
			<section className="mb-8">
				<h2 className="text-lg font-semibold mb-4">Risk Items</h2>

				<Suspense fallback={<RiskItemsSkeleton />}>
					<Await resolve={riskItems}>
						{(items) => (
							<RiskItemsSection
								items={items}
								canEdit={canEdit}
								assessmentFramework={assessment.framework}
								errors={errors}
							/>
						)}
					</Await>
				</Suspense>
			</section>

			{/* Feedback */}
			{canFeedback && (
				<section className="mb-8">
					<h2 className="text-lg font-semibold mb-4">Feedback</h2>

					<Suspense fallback={<FeedbackSkeleton />}>
						<Await resolve={feedbackList}>
							{(feedback: FeedbackItem[]) => (
								<div className="space-y-3 mb-4">
									{feedback.map((f) => (
										<div
											key={f.id}
											className="p-4 rounded-lg"
											style={{ background: "var(--surface-card)", border: "1px solid var(--surface-border)" }}
										>
											<p className="text-sm">{f.comment}</p>
											<p className="text-xs mt-1" style={{ color: "var(--text-color-secondary)" }}>{f.supervisor.fullName}</p>
										</div>
									))}
								</div>
							)}
						</Await>
					</Suspense>

					{(hasRole(user.role, Role.Supervisor) || hasRole(user.role, Role.Admin)) && (
						<Form method="post" className="flex gap-3">
							<input type="hidden" name="intent" value="add-feedback" />
							<InputTextarea
								name="comment"
								rows={3}
								placeholder="Leave feedback..."
								required
								className="flex-1"
								autoResize
							/>
							{errors?.comment && <Message severity="error" text={errors.comment[0]} className="w-full mt-1" />}
							<Button
								type="submit"
								label="Submit"
								icon="pi pi-send"
								className="self-end"
							/>
						</Form>
					)}
				</section>
			)}
		</div>
	)
}
