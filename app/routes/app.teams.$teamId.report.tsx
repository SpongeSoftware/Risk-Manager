import { data } from "react-router"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import type { Route } from "./+types/app.teams.$teamId.report"
import { requireUserLoader } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamById, getAssessmentsForTeam, getRiskItemsForAssessment } from "../server/queries"
import { isUserInTeam } from "../server/queries/teams"
import { riskLevel, riskLevelLabel, formatDate } from "../lib/formatters"
import { RiskMatrix } from "../components/domain/RiskMatrix"

export async function loader(args: Route.LoaderArgs) {
	return requireUserLoader(args, async (user) => {
		const teamId = Number(args.params.teamId)

		const team = await getTeamById(teamId)
		if (!team) throw data("Not found", { status: 404 })

		if (!hasRole(user.role, Role.Admin)) {
			const inTeam = await isUserInTeam(user.id, teamId)
			if (!inTeam) throw data("Access denied", { status: 403 })
		}

		const assessments = await getAssessmentsForTeam(teamId)
		const assessmentsWithItems = await Promise.all(
			assessments.map(async (a) => ({
				...a,
				riskItems: await getRiskItemsForAssessment(a.id),
			})),
		)

		return { team, assessments: assessmentsWithItems, generatedAt: new Date().toISOString() }
	})
}

const levelColors: Record<string, string> = {
	low: "text-green-600 dark:text-green-400",
	medium: "text-yellow-600 dark:text-yellow-400",
	high: "text-orange-600 dark:text-orange-400",
	critical: "text-red-600 dark:text-red-400",
}

export default function ReportPage({ loaderData }: Route.ComponentProps) {
	const { team, assessments, generatedAt } = loaderData
	const totalRisks = assessments.reduce((sum, a) => sum + a.riskItems.length, 0)
	const criticalRisks = assessments.flatMap((a) => a.riskItems).filter((r) => riskLevel(r.riskScore) === "critical").length
	const highRisks = assessments.flatMap((a) => a.riskItems).filter((r) => riskLevel(r.riskScore) === "high").length

	return (
		<div className="max-w-4xl print:max-w-full">
			<div className="flex items-center justify-between mb-8 print:mb-4">
				<div>
					<h1 className="text-3xl font-bold text-surface-900 dark:text-surface-0">
						Risk Assessment Report
					</h1>
					<p className="text-surface-500 mt-1">
						{team.name} — {team.semester.name} {team.semester.year}
					</p>
					<p className="text-xs text-surface-400 mt-1">Generated: {formatDate(generatedAt)}</p>
				</div>
				<Button
					label="Print / Export PDF"
					icon="pi pi-print"
					onClick={() => { window.print() }}
					className="print:hidden"
				/>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-8">
				{[
					{ label: "Total Assessments", value: assessments.length },
					{ label: "Total Risks", value: totalRisks },
					{ label: "Critical / High", value: `${criticalRisks} / ${highRisks}` },
				].map((s) => (
					<div
						key={s.label}
						className="p-4 bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-center"
					>
						<p className="text-2xl font-bold text-surface-900 dark:text-surface-0">{s.value}</p>
						<p className="text-sm text-surface-500">{s.label}</p>
					</div>
				))}
			</div>

			{assessments.map((assessment) => (
				<section key={assessment.id} className="mb-8 page-break-before">
					<h2 className="text-xl font-bold text-surface-900 dark:text-surface-0 mb-2">
						{assessment.title}
					</h2>
					<div className="flex gap-2 mb-4">
						<Tag value={assessment.framework} severity="info" />
						<Tag value={assessment.status} severity="secondary" />
					</div>

					{assessment.riskItems.length === 0 ? (
						<p className="text-surface-500 text-sm">No risk items.</p>
					) : (
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="bg-surface-50 dark:bg-surface-900">
									{["Asset", "Category", "Threat", "L", "I", "Score", "Level", "Treatment"].map((h) => (
										<th key={h} className="px-3 py-2 text-left font-medium text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{assessment.riskItems.map((item) => {
									const level = riskLevel(item.riskScore)
									return (
										<tr key={item.id} className="border border-surface-200 dark:border-surface-700">
											<td className="px-3 py-2">{item.assetName}</td>
											<td className="px-3 py-2">{item.assetCategory}</td>
											<td className="px-3 py-2">{item.threat}</td>
											<td className="px-3 py-2">{item.likelihood}</td>
											<td className="px-3 py-2">{item.impact}</td>
											<td className={`px-3 py-2 font-bold ${levelColors[level]}`}>{item.riskScore}</td>
											<td className={`px-3 py-2 ${levelColors[level]}`}>{riskLevelLabel(item.riskScore)}</td>
											<td className="px-3 py-2 capitalize">{item.treatment}</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					)}
					{assessment.riskItems.length > 0 && (
						<div className="mt-6 print:mt-4">
							<RiskMatrix items={assessment.riskItems} />
						</div>
					)}
				</section>
			))}
		</div>
	)
}
