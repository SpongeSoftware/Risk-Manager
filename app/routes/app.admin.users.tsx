import { data } from "react-router"
import type { Route } from "./+types/app.admin.users"
import { requireRole } from "../server/auth"
import { Role } from "../server/schema"
import { getAllUsers, createUser, updateUserRole, softDeleteUser } from "../server/queries/users"
import { createUserSchema, updateUserRoleSchema } from "../lib/schemas/user"
import { appendAudit } from "../server/queries/audits"
import { getRoleLabel } from "../lib/roles"

export async function loader({ request }: Route.LoaderArgs) {
	await requireRole(request, Role.Admin)
	const users = await getAllUsers()
	return { users }
}

export async function action({ request }: Route.ActionArgs) {
	const actor = await requireRole(request, Role.Admin)
	const formData = await request.formData()
	const intent = formData.get("intent") as string

	if (intent === "create-user") {
		const parsed = createUserSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

		const user = await createUser({
			id: crypto.randomUUID(),
			fullName: parsed.data.fullName,
			email: parsed.data.email,
			studentId: parsed.data.studentId,
			role: parsed.data.role,
			createdBy: actor.id,
			modifiedBy: actor.id,
		})
		await appendAudit("user", user.id, "created", actor.id)
	}

	if (intent === "update-role") {
		const parsed = updateUserRoleSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

		await updateUserRole(parsed.data.userId, parsed.data.role, actor.id)
		await appendAudit("user", parsed.data.userId, "updated", actor.id, {
			fieldChanged: "role",
			newValue: String(parsed.data.role),
		})
	}

	if (intent === "delete-user") {
		const userId = formData.get("userId") as string
		await softDeleteUser(userId, actor.id)
		await appendAudit("user", userId, "deleted", actor.id)
	}

	return data({ ok: true })
}

export default function AdminUsersPage({ loaderData }: Route.ComponentProps) {
	const { users } = loaderData

	return (
		<div>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				User Management
			</h1>

			{/* Create user form */}
			<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5 mb-6">
				<h2 className="font-medium text-surface-900 dark:text-surface-0 mb-4">Create Account</h2>
				<form method="post" className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<input type="hidden" name="intent" value="create-user" />
					<div>
						<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
							Full Name
						</label>
						<input
							name="fullName"
							type="text"
							required
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
							Email
						</label>
						<input
							name="email"
							type="email"
							required
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
							Student ID (optional)
						</label>
						<input
							name="studentId"
							type="text"
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
							Role
						</label>
						<select
							name="role"
							className="w-full border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0 text-sm"
						>
							<option value={1}>Student</option>
							<option value={2}>Supervisor</option>
							<option value={4}>Admin</option>
							<option value={6}>Supervisor + Admin</option>
							<option value={3}>Student + Supervisor</option>
						</select>
					</div>
					<div className="flex items-end">
						<button
							type="submit"
							className="py-2 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
						>
							Create
						</button>
					</div>
				</form>
			</div>

			{/* Users table */}
			<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-surface-50 dark:bg-surface-900">
							{["Name", "Email", "Student ID", "Role", "Status", "Actions"].map((h) => (
								<th key={h} className="px-4 py-3 text-left font-medium text-surface-600 dark:text-surface-400">
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{users.filter((u) => u.id !== "system").map((u) => (
							<tr key={u.id} className="border-t border-surface-100 dark:border-surface-800">
								<td className="px-4 py-3 font-medium">{u.fullName}</td>
								<td className="px-4 py-3 text-surface-500">{u.email}</td>
								<td className="px-4 py-3 text-surface-500">{u.studentId ?? "—"}</td>
								<td className="px-4 py-3">{getRoleLabel(u.role)}</td>
								<td className="px-4 py-3">
									{u.workosId ? (
										<span className="text-xs text-green-600 dark:text-green-400">Linked</span>
									) : (
										<span className="text-xs text-yellow-600 dark:text-yellow-400">Pending</span>
									)}
								</td>
								<td className="px-4 py-3">
									<form method="post" className="inline">
										<input type="hidden" name="intent" value="delete-user" />
										<input type="hidden" name="userId" value={u.id} />
										<button
											type="submit"
											className="text-red-500 hover:text-red-700 text-xs"
											onClick={(e) => {
												if (!confirm(`Delete ${u.fullName}?`)) e.preventDefault()
											}}
										>
											Delete
										</button>
									</form>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
