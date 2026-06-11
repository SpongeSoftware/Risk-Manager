import { data } from "react-router"
import type { Route } from "./+types/app.teams.$teamId.members"
import { requireUser } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamById, getTeamMembers, addTeamMember, removeTeamMember } from "../server/queries"
import { getAllUsers } from "../server/queries/users"
import { addTeamMemberSchema } from "../lib/schemas/team"

export async function loader({ request, params }: Route.LoaderArgs) {
	const user = await requireUser(request)
	const teamId = Number(params.teamId)
	const team = await getTeamById(teamId)
	if (!team) throw data("Not found", { status: 404 })

	const [members, allUsers] = await Promise.all([
		getTeamMembers(teamId),
		hasRole(user.role, Role.Admin) ? getAllUsers() : Promise.resolve([]),
	])

	const canManage = hasRole(user.role, Role.Admin) || hasRole(user.role, Role.Supervisor)
	return { team, members, allUsers, user, canManage }
}

export async function action({ request, params }: Route.ActionArgs) {
	const user = await requireUser(request)
	if (!hasRole(user.role, Role.Admin) && !hasRole(user.role, Role.Supervisor)) {
		throw data("Forbidden", { status: 403 })
	}

	const teamId = Number(params.teamId)
	const formData = await request.formData()
	const intent = formData.get("intent") as string

	if (intent === "add-member") {
		const parsed = addTeamMemberSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
		await addTeamMember(teamId, parsed.data.userId, parsed.data.memberRole, user.id)
	}

	if (intent === "remove-member") {
		const userId = formData.get("userId") as string
		await removeTeamMember(teamId, userId, user.id)
	}

	return data({ ok: true })
}

export default function TeamMembersPage({ loaderData }: Route.ComponentProps) {
	const { team, members, allUsers, canManage } = loaderData

	return (
		<div>
			<a
				href={`/teams/${team.id}`}
				className="text-sm text-purple-600 dark:text-purple-400 hover:underline mb-3 block"
			>
				← Back to team
			</a>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				{team.name} — Members
			</h1>

			<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden mb-6">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-surface-50 dark:bg-surface-900">
							<th className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">Name</th>
							<th className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">Email</th>
							<th className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">Role</th>
							{canManage && <th className="px-4 py-3" />}
						</tr>
					</thead>
					<tbody>
						{members.map((m) => (
							<tr key={m.userId} className="border-t border-surface-100 dark:border-surface-800">
								<td className="px-4 py-3">{m.user.fullName}</td>
								<td className="px-4 py-3 text-surface-500">{m.user.email}</td>
								<td className="px-4 py-3 capitalize">{m.memberRole}</td>
								{canManage && (
									<td className="px-4 py-3 text-right">
										<form method="post">
											<input type="hidden" name="intent" value="remove-member" />
											<input type="hidden" name="userId" value={m.userId} />
											<button type="submit" className="text-red-500 hover:text-red-700 text-xs">
												Remove
											</button>
										</form>
									</td>
								)}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{canManage && allUsers.length > 0 && (
				<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
					<h2 className="font-medium text-surface-900 dark:text-surface-0 mb-3">Add Member</h2>
					<form method="post" className="flex gap-3 flex-wrap">
						<input type="hidden" name="intent" value="add-member" />
						<select
							name="userId"
							className="border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						>
							{allUsers.map((u) => (
								<option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
							))}
						</select>
						<select
							name="memberRole"
							className="border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						>
							<option value="student">Student</option>
							<option value="supervisor">Supervisor</option>
						</select>
						<button
							type="submit"
							className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
						>
							Add
						</button>
					</form>
				</div>
			)}
		</div>
	)
}
