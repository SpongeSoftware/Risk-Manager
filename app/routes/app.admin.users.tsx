import { useState, useEffect, useRef } from "react"
import { data, redirect, useFetcher, useRevalidator, Form } from "react-router"
import { InputText } from "primereact/inputtext"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Tag } from "primereact/tag"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Message } from "primereact/message"
import { Card } from "primereact/card"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import { FilterMatchMode } from "primereact/api"
import type { Route } from "./+types/app.admin.users"
import { useActionToast } from "../hooks/useActionToast"
import { useFlashToast } from "../hooks/useFlashToast"
import { requireRole, requireRoleLoader } from "../server/auth"
import type { User } from "../server/schema"
import { Role } from "../server/schema"
import { hasRole } from "../lib/roles"
import {
	getAllUsers,
	createUser,
	updateUserRole,
	softDeleteUser,
	getAdminUserCount,
} from "../server/queries/users"
import { z } from "zod/v4"
import { createUserSchema, updateUserRoleSchema } from "../lib/schemas/user"
import { appendAudit } from "../server/queries/audits"

export async function loader(args: Route.LoaderArgs) {
	return requireRoleLoader(args, Role.Admin, async () => {
		const users = await getAllUsers()
		return { users }
	})
}

export async function action({ request }: Route.ActionArgs) {
	const actor = await requireRole(request, Role.Admin)
	const formData = await request.formData()
	const intent = formData.get("intent") as string

	if (intent === "create-user") {
		const parsed = createUserSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })

		const user = await createUser({
			id: crypto.randomUUID(),
			fullName: parsed.data.fullName,
			email: parsed.data.email,
			studentId: parsed.data.studentId,
			role: parsed.data.role,
			createdBy: actor.id,
			modifiedBy: actor.id,
		})
		await appendAudit("user", user.id, "created", actor.id, {
			newValue: JSON.stringify(user),
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "User created" } })
	}

	if (intent === "update-role") {
		const parsed = updateUserRoleSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })

		const allUsers = await getAllUsers()
		const target = allUsers.find((u) => u.id === parsed.data.userId)
		if (target && hasRole(target.role, Role.Admin) && !hasRole(parsed.data.role, Role.Admin)) {
			const adminCount = await getAdminUserCount()
			if (adminCount <= 1) {
				return data({ errors: { role: ["At least one Admin must remain"] }, toast: { severity: "error" as const, summary: "At least one Admin must remain" } }, { status: 400 })
			}
		}

		await updateUserRole(parsed.data.userId, parsed.data.role, actor.id)
		await appendAudit("user", parsed.data.userId, "updated", actor.id, {
			fieldChanged: "role",
			oldValue: target ? String(target.role) : undefined,
			newValue: String(parsed.data.role),
		})

		if (parsed.data.userId === actor.id) {
			throw redirect("/admin/users?toastSeverity=success&toastSummary=Role+updated")
		}

		return data({ ok: true, toast: { severity: "success" as const, summary: "Role updated" } })
	}

	if (intent === "delete-user") {
		const userId = formData.get("userId") as string

		const allUsers = await getAllUsers()
		const target = allUsers.find((u) => u.id === userId)
		if (target && hasRole(target.role, Role.Admin)) {
			const adminCount = await getAdminUserCount()
			if (adminCount <= 1) {
				return data({ errors: { delete: ["Cannot delete the last Admin account"] }, toast: { severity: "error" as const, summary: "Cannot delete the last Admin account" } }, { status: 400 })
			}
		}

		await softDeleteUser(userId, actor.id)
		await appendAudit("user", userId, "deleted", actor.id, {
			oldValue: target ? JSON.stringify(target) : undefined,
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "User deleted" } })
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

type User = Awaited<ReturnType<typeof getAllUsers>>[number]

function RoleCell({ user }: { user: User }) {
	const fetcher = useFetcher()
	const revalidator = useRevalidator()
	const prevState = useRef(fetcher.state)
	useActionToast(fetcher.data as Parameters<typeof useActionToast>[0])

	useEffect(() => {
		if (prevState.current === "submitting" && fetcher.state === "idle") {
			void revalidator.revalidate()
		}
		prevState.current = fetcher.state
	}, [fetcher.state, revalidator])

	return (
		<fetcher.Form method="post">
			<Dropdown
				value={user.role}
				options={roleOptions}
				onChange={(e) => {
					const fd = new FormData()
					fd.set("intent", "update-role")
					fd.set("userId", user.id)
					fd.set("role", String(e.value))
					void fetcher.submit(fd, { method: "post" })
				}}
				className="w-40"
			/>
		</fetcher.Form>
	)
}

function CreateUserForm({ errors }: { errors?: Record<string, string[] | undefined> }) {
	const [role, setRole] = useState(1)

	return (
		<Card className="mb-6">
			<h2 className="font-semibold mb-4">Create Account</h2>
			<Form method="post" className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<input type="hidden" name="intent" value="create-user" />

				<div>
					<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
						Full Name
					</label>
					<InputText name="fullName" required className="w-full" />
					{errors?.fullName && <Message severity="error" text={errors.fullName[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
						Email
					</label>
					<InputText name="email" type="email" required className="w-full" />
					{errors?.email && <Message severity="error" text={errors.email[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
						Student ID (optional)
					</label>
					<InputText name="studentId" className="w-full" />
				</div>

				<div>
					<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
						Role
					</label>
					<input type="hidden" name="role" value={role} />
					<Dropdown
						value={role}
						onChange={(e) => { setRole(e.value as number) }}
						options={roleOptions}
						className="w-full"
					/>
				</div>

				<div className="flex items-end">
					<Button type="submit" label="Create" icon="pi pi-user-plus" />
				</div>
			</Form>
		</Card>
	)
}

export default function AdminUsersPage({ loaderData, actionData }: Route.ComponentProps) {
	const { users } = loaderData
	const errors = actionData && "errors" in actionData ? (actionData.errors as Record<string, string[] | undefined>) : undefined
	useActionToast(actionData as Parameters<typeof useActionToast>[0])
	useFlashToast()
	const tableUsers = users.filter((u) => u.id !== "system")

	const [globalFilterValue, setGlobalFilterValue] = useState("")
	const [filters, setFilters] = useState({
		global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
	})

	function onGlobalFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value
		setFilters({ global: { value: value || null, matchMode: FilterMatchMode.CONTAINS } })
		setGlobalFilterValue(value)
	}

	const tableHeader = (
		<div className="flex justify-between items-center">
			<span className="text-sm text-surface-500">
				{tableUsers.length} user{tableUsers.length !== 1 ? "s" : ""}
			</span>
			<IconField iconPosition="left">
				<InputIcon className="pi pi-search" />
				<InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search users..." />
			</IconField>
		</div>
	)

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">User Management</h1>

			<CreateUserForm errors={errors} />

			{errors?.role && <Message severity="error" text={errors.role[0]} className="w-full mb-4" />}
			{errors?.delete && <Message severity="error" text={errors.delete[0]} className="w-full mb-4" />}

			<DataTable
				value={tableUsers}
				stripedRows
				emptyMessage="No users found."
				paginator
				rows={10}
				rowsPerPageOptions={[5, 10, 25]}
				filters={filters}
				globalFilterFields={["fullName", "email", "studentId"]}
				header={tableHeader}
				sortMode="single"
				removableSort
			>
				<Column field="fullName" header="Name" sortable />
				<Column field="email" header="Email" sortable />
				<Column header="Student ID" body={(u: User) => u.studentId ?? "—"} sortable field="studentId" />
				<Column header="Role" body={(u: User) => <RoleCell user={u} />} />
				<Column
					header="Status"
					body={(u: User) =>
						u.workosId
							? <Tag severity="success" value="Linked" />
							: <Tag severity="warning" value="Pending" />
					}
					sortable
					field="workosId"
				/>
				<Column
					header="Actions"
					body={(u: User) => (
						<Form method="post" style={{ display: "inline" }}>
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
						</Form>
					)}
				/>
			</DataTable>
		</div>
	)
}
