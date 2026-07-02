import { useState, useEffect, useRef } from "react"
import { data, redirect, useFetcher, useRevalidator, Form } from "react-router"
import type { Route } from "./+types/app.admin.users"

import { InputText } from "primereact/inputtext"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { Tag } from "primereact/tag"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Message } from "primereact/message"
import { Card } from "primereact/card"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import { FilterMatchMode } from "primereact/api"
import { useActionToast } from "../hooks/useActionToast"
import { useFlashToast } from "../hooks/useFlashToast"
import { requireRole, requireRoleLoader } from "../server/auth"
import { Role } from "../server/schema"
import { hasRole } from "../lib/roles"
import {
	getAllUsers,
	createUser,
	updateUserRole,
	softDeleteUser,
	getAdminUserCount,
	setInviteToken,
} from "../server/queries/users"
import { deleteSessionsForUser } from "../server/queries/sessions"
import { generateToken, hashToken } from "../server/password"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Users" }]
import { z } from "zod/v4"
import {
	createUserSchema,
	updateUserRoleSchema,
	deleteUserSchema,
	generateInviteSchema,
} from "../lib/schemas/user"
import { appendAudit } from "../server/queries/audits"

/** Invite links stay valid for 7 days. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Creates a fresh invite token for a user and returns the link to hand out.
 * Only the SHA-256 of the token is stored; the raw link exists solely in the
 * action response the admin copies from.
 */
async function issueInvite(request: Request, userId: string, actorId: string) {
	const token = generateToken()
	const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString()
	await setInviteToken(userId, hashToken(token), expiresAt, actorId)
	await appendAudit("user", userId, "updated", actorId, { fieldChanged: "invite" })
	return `${new URL(request.url).origin}/set-password?token=${token}`
}

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
		const inviteUrl = await issueInvite(request, user.id, actor.id)
		return data({
			ok: true,
			inviteUrl,
			inviteName: user.fullName,
			toast: { severity: "success" as const, summary: "User created" },
		})
	}

	if (intent === "generate-invite") {
		const parsed = generateInviteSchema.safeParse(Object.fromEntries(formData))
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })

		const allUsers = await getAllUsers()
		const target = allUsers.find((u) => u.id === parsed.data.userId)
		if (!target || target.id === "system") {
			return data({ errors: { invite: ["User not found"] } }, { status: 400 })
		}

		// Regenerating an invite doubles as a password reset, so revoke any
		// existing sessions — the account is unusable until the link is redeemed.
		await deleteSessionsForUser(target.id)
		const inviteUrl = await issueInvite(request, target.id, actor.id)
		return data({
			ok: true,
			inviteUrl,
			inviteName: target.fullName,
			toast: { severity: "success" as const, summary: "Invite link generated" },
		})
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
		const parsedDelete = deleteUserSchema.safeParse(Object.fromEntries(formData))
		if (!parsedDelete.success) return data({ errors: z.flattenError(parsedDelete.error).fieldErrors }, { status: 400 })
		const userId = parsedDelete.data.userId

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

/** Modal showing a freshly generated invite link with a copy button. */
function InviteLinkDialog({
	url,
	name,
	onHide,
}: {
	url: string
	name: string
	onHide: () => void
}) {
	const [copied, setCopied] = useState(false)

	return (
		<Dialog
			header={`Invite link for ${name}`}
			visible
			onHide={onHide}
			className="w-full max-w-lg mx-4"
		>
			<p className="text-sm mb-3" style={{ color: "var(--text-color-secondary)" }}>
				Share this link with the user so they can set their password. It can be used
				once and expires in 7 days. It will not be shown again.
			</p>
			<div className="flex gap-2">
				<InputText value={url} readOnly className="w-full text-sm" onFocus={(e) => { e.target.select() }} />
				<Button
					type="button"
					icon={copied ? "pi pi-check" : "pi pi-copy"}
					label={copied ? "Copied" : "Copy"}
					onClick={() => {
						void navigator.clipboard.writeText(url).then(() => { setCopied(true) })
					}}
				/>
			</div>
		</Dialog>
	)
}

/** Per-row invite/reset button. Opens a dialog with the one-time link on success. */
function InviteCell({ user }: { user: User }) {
	const fetcher = useFetcher<{ inviteUrl?: string; inviteName?: string }>()
	const [dismissed, setDismissed] = useState<string | null>(null)
	useActionToast(fetcher.data as Parameters<typeof useActionToast>[0])

	const inviteUrl = fetcher.data?.inviteUrl
	const hasPassword = Boolean(user.passwordHash)

	return (
		<>
			<fetcher.Form method="post" style={{ display: "inline" }}>
				<input type="hidden" name="intent" value="generate-invite" />
				<input type="hidden" name="userId" value={user.id} />
				<Button
					type="submit"
					icon={hasPassword ? "pi pi-key" : "pi pi-envelope"}
					tooltip={hasPassword ? "Reset password (new invite link)" : "Generate invite link"}
					tooltipOptions={{ position: "top" }}
					text
					size="small"
					loading={fetcher.state !== "idle"}
					onClick={(e) => {
						if (hasPassword && !confirm(`Reset ${user.fullName}'s password? Their current password and sessions will stop working.`)) {
							e.preventDefault()
						}
					}}
				/>
			</fetcher.Form>
			{inviteUrl && inviteUrl !== dismissed && (
				<InviteLinkDialog
					url={inviteUrl}
					name={fetcher.data?.inviteName ?? user.fullName}
					onHide={() => { setDismissed(inviteUrl) }}
				/>
			)}
		</>
	)
}

/** Account status derived from password/invite state. */
function StatusTag({ user }: { user: User }) {
	if (user.passwordHash) return <Tag severity="success" value="Active" />
	if (user.inviteTokenExpiresAt && user.inviteTokenExpiresAt > new Date().toISOString()) {
		return <Tag severity="info" value="Invited" />
	}
	if (user.inviteTokenExpiresAt) return <Tag severity="warning" value="Invite expired" />
	return <Tag severity="warning" value="Not invited" />
}

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

	// Invite link returned by the create-user action — shown once in a dialog.
	const createdInvite =
		actionData && "inviteUrl" in actionData && typeof actionData.inviteUrl === "string"
			? {
				url: actionData.inviteUrl,
				name: "inviteName" in actionData ? String(actionData.inviteName) : "",
			}
			: null
	const [dismissedInvite, setDismissedInvite] = useState<string | null>(null)

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
			{errors?.invite && <Message severity="error" text={errors.invite[0]} className="w-full mb-4" />}

			{createdInvite && createdInvite.url !== dismissedInvite && (
				<InviteLinkDialog
					url={createdInvite.url}
					name={createdInvite.name}
					onHide={() => { setDismissedInvite(createdInvite.url) }}
				/>
			)}

			<DataTable
				value={tableUsers}
				scrollable
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
					body={(u: User) => <StatusTag user={u} />}
					sortable
					field="passwordHash"
				/>
				<Column
					header="Actions"
					body={(u: User) => (
						<div className="flex items-center">
							<InviteCell user={u} />
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
						</div>
					)}
				/>
			</DataTable>
		</div>
	)
}
