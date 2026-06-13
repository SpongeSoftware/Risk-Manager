import { useState } from "react"
import { data } from "react-router"
import { InputText } from "primereact/inputtext"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Message } from "primereact/message"
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

const roleOptions = [
	{ label: "Student", value: 1 },
	{ label: "Supervisor", value: 2 },
	{ label: "Admin", value: 4 },
	{ label: "Supervisor + Admin", value: 6 },
	{ label: "Student + Supervisor", value: 3 },
]

function CreateUserForm({ errors }: { errors?: Record<string, string[]> }) {
	const [role, setRole] = useState(1)

	return (
		<div className="bg-surface-0 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-5 mb-6">
			<h2 className="font-semibold text-surface-900 dark:text-surface-0 mb-4">Create Account</h2>
			<form method="post" className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<input type="hidden" name="intent" value="create-user" />

				<div>
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						Full Name
					</label>
					<InputText name="fullName" required className="w-full" />
					{errors?.fullName && <Message severity="error" text={errors.fullName[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						Email
					</label>
					<InputText name="email" type="email" required className="w-full" />
					{errors?.email && <Message severity="error" text={errors.email[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						Student ID (optional)
					</label>
					<InputText name="studentId" className="w-full" />
				</div>

				<div>
					<label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1">
						Role
					</label>
					<input type="hidden" name="role" value={role} />
					<Dropdown
						value={role}
						onChange={(e) => setRole(e.value)}
						options={roleOptions}
						className="w-full"
					/>
				</div>

				<div className="flex items-end">
					<Button type="submit" label="Create" icon="pi pi-user-plus" />
				</div>
			</form>
		</div>
	)
}

export default function AdminUsersPage({ loaderData, actionData }: Route.ComponentProps) {
	const { users } = loaderData
	const errors = actionData && "errors" in actionData ? actionData.errors : undefined
	const tableUsers = users.filter((u) => u.id !== "system")

	return (
		<div>
			<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-6">
				User Management
			</h1>

			<CreateUserForm errors={errors} />

			<DataTable value={tableUsers} stripedRows emptyMessage="No users found.">
				<Column field="fullName" header="Name" />
				<Column field="email" header="Email" />
				<Column header="Student ID" body={(u) => u.studentId ?? "—"} />
				<Column header="Role" body={(u) => getRoleLabel(u.role)} />
				<Column
					header="Status"
					body={(u) =>
						u.workosId
							? <Tag severity="success" value="Linked" />
							: <Tag severity="warning" value="Pending" />
					}
				/>
				<Column
					header="Actions"
					body={(u) => (
						<form method="post" style={{ display: "inline" }}>
							<input type="hidden" name="intent" value="delete-user" />
							<input type="hidden" name="userId" value={u.id} />
							<Button
								type="submit"
								icon="pi pi-trash"
								severity="danger"
								text
								size="small"
								onClick={(e) => {
									if (!confirm(`Delete ${u.fullName}?`)) e.preventDefault()
								}}
							/>
						</form>
					)}
				/>
			</DataTable>
		</div>
	)
}
