import type { Route } from "./+types/app.admin.teams._index"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { getAllTeams } from "../server/queries"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	const teams = await getAllTeams()
	return { teams }
}

export default function AdminTeamsPage({ loaderData }: Route.ComponentProps) {
	const { teams } = loaderData

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
					Team Management
				</h1>
				<a
					href="/admin/teams/new"
					className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
				>
					<i className="pi pi-plus mr-2" />
					New Team
				</a>
			</div>

			<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-surface-50 dark:bg-surface-900">
							{["Team Name", "Semester", "Status", "Actions"].map((h) => (
								<th key={h} className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{teams.map((t) => (
							<tr key={t.id} className="border-t border-surface-100 dark:border-surface-800">
								<td className="px-4 py-3 font-medium">{t.name}</td>
								<td className="px-4 py-3 text-surface-500">{t.semester.name}</td>
								<td className="px-4 py-3">
									{t.semester.isActive ? (
										<span className="text-xs text-green-600 dark:text-green-400">Active</span>
									) : (
										<span className="text-xs text-red-500 dark:text-red-400">Inactive</span>
									)}
								</td>
								<td className="px-4 py-3">
									<a
										href={`/teams/${t.id}`}
										className="text-purple-600 dark:text-purple-400 hover:underline text-xs mr-3"
									>
										View
									</a>
									<a
										href={`/teams/${t.id}/members`}
										className="text-purple-600 dark:text-purple-400 hover:underline text-xs"
									>
										Members
									</a>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
