import { data } from "react-router"
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
						<span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
							{assessment.framework}
						</span>
						<span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
							{assessment.status}
						</span>
						{!isActive && (
							<span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
								Read Only (Semester Inactive)
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Risk Items */}
			<section className="mb-8">
				<h2 className="text-lg font-semibold text-surface-900 dark:text-surface-0 mb-4">
					Risk Items ({riskItems.length})
				</h2>

				{riskItems.length === 0 ? (
					<p className="text-surface-500 text-sm">No risk items yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left border-b border-surface-200 dark:border-surface-700">
									<th className="pb-3 pr-4 text-surface-600 dark:text-surface-400 font-medium">Asset</th>
									<th className="pb-3 pr-4 text-surface-600 dark:text-surface-400 font-medium">Threat</th>
									<th className="pb-3 pr-4 text-surface-600 dark:text-surface-400 font-medium">L</th>
									<th className="pb-3 pr-4 text-surface-600 dark:text-surface-400 font-medium">I</th>
									<th className="pb-3 pr-4 text-surface-600 dark:text-surface-400 font-medium">Score</th>
									<th className="pb-3 pr-4 text-surface-600 dark:text-surface-400 font-medium">Treatment</th>
									{canEdit && <th className="pb-3" />}
								</tr>
							</thead>
							<tbody>
								{riskItems.map((item) => {
									const level = riskLevel(item.riskScore)
									const levelColors = {
										low: "text-green-600 dark:text-green-400",
										medium: "text-yellow-600 dark:text-yellow-400",
										high: "text-orange-600 dark:text-orange-400",
										critical: "text-red-600 dark:text-red-400",
									}
									return (
										<tr key={item.id} className="border-b border-surface-100 dark:border-surface-800">
											<td className="py-3 pr-4">{item.assetName}</td>
											<td className="py-3 pr-4">{item.threat}</td>
											<td className="py-3 pr-4">{item.likelihood}</td>
											<td className="py-3 pr-4">{item.impact}</td>
											<td className={`py-3 pr-4 font-bold ${levelColors[level]}`}>
												{item.riskScore}
											</td>
											<td className="py-3 pr-4 capitalize">{item.treatment}</td>
											{canEdit && (
												<td className="py-3">
													<form method="post">
														<input type="hidden" name="intent" value="delete-risk-item" />
														<input type="hidden" name="itemId" value={item.id} />
														<button
															type="submit"
															className="text-red-500 hover:text-red-700 text-xs"
															onClick={(e) => {
																if (!confirm("Delete this risk item?")) e.preventDefault()
															}}
														>
															<i className="pi pi-trash" />
														</button>
													</form>
												</td>
											)}
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}

				{canEdit && (
					<AddRiskItemForm assessmentFramework={assessment.framework} />
				)}
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
								<p className="text-xs text-surface-500 mt-1">
									{f.supervisor.fullName}
								</p>
							</div>
						))}
					</div>
					{(hasRole(user.role, Role.Supervisor) || hasRole(user.role, Role.Admin)) && (
						<form method="post" className="flex gap-3">
							<input type="hidden" name="intent" value="add-feedback" />
							<textarea
								name="comment"
								rows={3}
								className="flex-1 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
								placeholder="Leave feedback..."
								required
							/>
							<button
								type="submit"
								className="self-end py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
							>
								Submit
							</button>
						</form>
					)}
				</section>
			)}
		</div>
	)
}

function AddRiskItemForm({ assessmentFramework }: { assessmentFramework: string }) {
	const showSoc2 = assessmentFramework === "SOC2" || assessmentFramework === "BOTH"

	return (
		<details className="mt-6 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
			<summary className="font-medium cursor-pointer text-surface-900 dark:text-surface-0">
				+ Add Risk Item
			</summary>
			<form method="post" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
				<input type="hidden" name="intent" value="add-risk-item" />
				{[
					{ name: "assetName", label: "Asset Name" },
					{ name: "assetCategory", label: "Asset Category" },
					{ name: "threat", label: "Threat" },
					{ name: "vulnerability", label: "Vulnerability" },
				].map((f) => (
					<div key={f.name}>
						<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
							{f.label}
						</label>
						<input
							name={f.name}
							type="text"
							required
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						/>
					</div>
				))}
				{["Likelihood (1-5)", "Impact (1-5)"].map((label, i) => (
					<div key={label}>
						<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
							{label}
						</label>
						<input
							name={i === 0 ? "likelihood" : "impact"}
							type="number"
							min={1}
							max={5}
							required
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						/>
					</div>
				))}
				<div>
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						Treatment
					</label>
					<select
						name="treatment"
						className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
					>
						<option value="mitigate">Mitigate</option>
						<option value="accept">Accept</option>
						<option value="transfer">Transfer</option>
						<option value="avoid">Avoid</option>
					</select>
				</div>
				{showSoc2 && (
					<div>
						<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
							SOC2 Criteria (optional)
						</label>
						<input
							name="soc2Criteria"
							type="text"
							placeholder="e.g. CC6.1"
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						/>
					</div>
				)}
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						Controls (optional)
					</label>
					<textarea
						name="controls"
						rows={2}
						className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
					/>
				</div>
				<div className="md:col-span-2">
					<button
						type="submit"
						className="py-2 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
					>
						Add Risk Item
					</button>
				</div>
			</form>
		</details>
	)
}
