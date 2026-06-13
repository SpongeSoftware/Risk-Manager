import { useState } from "react"
import { data } from "react-router"
import { Link } from "react-router"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
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

const memberRoleOptions = [
	{ label: "Student", value: "student" },
	{ label: "Supervisor", value: "supervisor" },
]

function AddMemberForm({ allUsers }: { allUsers: { id: string; fullName: string; email: string | null }[] }) {
	const userOptions = allUsers.map((u) => ({
		label: `${u.fullName} (${u.email})`,
		value: u.id,
	}))
	const [userId, setUserId] = useState(userOptions[0]?.value ?? "")
	const [memberRole, setMemberRole] = useState("student")

	return (
		<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5">
			<h2 className="font-semibold text-surface-900 dark:text-surface-0 mb-3">Add Member</h2>
			<form method="post" className="flex gap-3 flex-wrap items-end">
				<input type="hidden" name="intent" value="add-member" />
				<input type="hidden" name="userId" value={userId} />
				<input type="hidden" name="memberRole" value={memberRole} />

				<div>
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						User
					</label>
					<Dropdown
						value={userId}
						onChange={(e) => setUserId(e.value)}
						options={userOptions}
						filter
						className="min-w-64"
						emptyMessage="No users available"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						Role
					</label>
					<Dropdown
						value={memberRole}
						onChange={(e) => setMemberRole(e.value)}
						options={memberRoleOptions}
					/>
				</div>

				<Button type="submit" label="Add" icon="pi pi-user-plus" />
			</form>
		</div>
	)
}

export default function TeamMembersPage({ loaderData }: Route.ComponentProps) {
	const { team, members, allUsers, canManage } = loaderData

	return (
		<div>
			<Link
				to={`/teams/${team.id}`}
				className="text-sm text-purple-600 dark:text-purple-400 hover:underline mb-3 block"
			>
				← Back to team
			</Link>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				{team.name} — Members
			</h1>

			<div className="mb-6">
				<DataTable value={members} stripedRows emptyMessage="No members yet.">
					<Column header="Name" body={(m) => m.user.fullName} />
					<Column header="Email" body={(m) => m.user.email} />
					<Column header="Role" body={(m) => <span className="capitalize">{m.memberRole}</span>} />
					{canManage && (
						<Column
							header=""
							body={(m) => (
								<form method="post" style={{ display: "inline" }}>
									<input type="hidden" name="intent" value="remove-member" />
									<input type="hidden" name="userId" value={m.userId} />
									<Button
										type="submit"
										label="Remove"
										severity="danger"
										text
										size="small"
									/>
								</form>
							)}
						/>
					)}
				</DataTable>
			</div>

			{canManage && allUsers.length > 0 && <AddMemberForm allUsers={allUsers} />}
		</div>
	)
}
