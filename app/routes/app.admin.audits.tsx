import type { Route } from "./+types/app.admin.audits"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { getAllAudits } from "../server/queries/audits"
import { formatDateTime } from "../lib/formatters"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	const audits = await getAllAudits()
	return { audits }
}

export default function AdminAuditsPage({ loaderData }: Route.ComponentProps) {
	const { audits } = loaderData

	return (
		<div>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				System Audit Trail
			</h1>

			<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-surface-50 dark:bg-surface-900">
							{["Date", "Entity", "ID", "Action", "Field", "Old", "New", "By"].map((h) => (
								<th key={h} className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{audits.length === 0 && (
							<tr>
								<td colSpan={8} className="px-4 py-8 text-center text-surface-500">
									No audit entries yet.
								</td>
							</tr>
						)}
						{audits.map((a) => (
							<tr key={a.id} className="border-t border-surface-100 dark:border-surface-800">
								<td className="px-4 py-3 text-surface-500">{formatDateTime(a.createdDate)}</td>
								<td className="px-4 py-3 capitalize">{a.entityType.replace("_", " ")}</td>
								<td className="px-4 py-3 text-surface-500">{a.entityId}</td>
								<td className="px-4 py-3 capitalize">{a.action}</td>
								<td className="px-4 py-3 text-surface-500">{a.fieldChanged ?? "—"}</td>
								<td className="px-4 py-3 text-surface-500 max-w-32 truncate">{a.oldValue ?? "—"}</td>
								<td className="px-4 py-3 text-surface-500 max-w-32 truncate">{a.newValue ?? "—"}</td>
								<td className="px-4 py-3 text-surface-500">{a.createdBy}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
