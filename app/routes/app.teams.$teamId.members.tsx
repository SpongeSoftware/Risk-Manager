import { useState } from "react"
import { data, Form } from "react-router"
import { Link } from "react-router"
import type { Route } from "./+types/app.teams.$teamId.members"

import { useActionToast } from "../hooks/useActionToast"
import { useFlashToast } from "../hooks/useFlashToast"
import { DataTable } from "primereact/datatable"
import { Column } from "primereact/column"
import { Dropdown } from "primereact/dropdown"
import { Button } from "primereact/button"
import { Card } from "primereact/card"
import { Message } from "primereact/message"
import { InputText } from "primereact/inputtext"
import { IconField } from "primereact/iconfield"
import { InputIcon } from "primereact/inputicon"
import { FilterMatchMode } from "primereact/api"
import { requireUser, requireUserLoader } from "../server/auth"
import { Role, hasRole } from "../server/schema"
import { getTeamById, getTeamMembers, addTeamMember, removeTeamMember } from "../server/queries"
import { getAllUsers } from "../server/queries/users"
import { appendAudit } from "../server/queries/audits"
import { z } from "zod/v4"
import { addTeamMemberSchema } from "../lib/schemas/team"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Team Members" }]

export async function loader(args: Route.LoaderArgs) {
	return requireUserLoader(args, async (user) => {
		const teamId = Number(args.params.teamId)
		const team = await getTeamById(teamId)
		if (!team) throw data("Not found", { status: 404 })

		const [members, allUsers] = await Promise.all([
			getTeamMembers(teamId),
			hasRole(user.role, Role.Admin) ? getAllUsers() : Promise.resolve([]),
		])

		const canManage = hasRole(user.role, Role.Admin) || hasRole(user.role, Role.Supervisor)
		return { team, members, allUsers, user, canManage }
	})
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
		if (!parsed.success) return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })
		await addTeamMember(teamId, parsed.data.userId, parsed.data.memberRole, user.id)
		await appendAudit("team", teamId, "updated", user.id, {
			fieldChanged: "members",
			newValue: JSON.stringify({ userId: parsed.data.userId, memberRole: parsed.data.memberRole, action: "added" }),
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Member added" } })
	}

	if (intent === "remove-member") {
		const userId = formData.get("userId") as string
		const members = await getTeamMembers(teamId)
		const member = members.find((m) => m.userId === userId)
		await removeTeamMember(teamId, userId, user.id)
		await appendAudit("team", teamId, "updated", user.id, {
			fieldChanged: "members",
			oldValue: member ? JSON.stringify({ userId: member.userId, memberRole: member.memberRole }) : JSON.stringify({ userId }),
		})
		return data({ ok: true, toast: { severity: "success" as const, summary: "Member removed" } })
	}

	return data({ ok: true })
}

const memberRoleOptions = [
	{ label: "Student", value: "student" },
	{ label: "Supervisor", value: "supervisor" },
]

function AddMemberForm({
	allUsers,
	errors,
}: {
	allUsers: { id: string; fullName: string; email: string | null }[]
	errors?: Record<string, string[] | undefined>
}) {
	const userOptions = allUsers.map((u) => ({
		label: `${u.fullName} (${u.email ?? ""})`,
		value: u.id,
	}))
	const [userId, setUserId] = useState(userOptions[0]?.value ?? "")
	const [memberRole, setMemberRole] = useState("student")

	return (
		<Card>
			<h2 className="font-semibold mb-3">Add Member</h2>
			<Form method="post" className="flex gap-3 flex-wrap items-end">
				<input type="hidden" name="intent" value="add-member" />
				<input type="hidden" name="userId" value={userId} />
				<input type="hidden" name="memberRole" value={memberRole} />

				<div>
					<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
						User
					</label>
					<Dropdown
						value={userId}
						onChange={(e) => { setUserId(e.value as string) }}
						options={userOptions}
						filter
						className="min-w-64"
						emptyMessage="No users available"
					/>
					{errors?.userId && <Message severity="error" text={errors.userId[0]} className="w-full mt-1" />}
				</div>

				<div>
					<label className="block text-sm font-medium mb-1" style={{ color: "var(--text-color-secondary)" }}>
						Role
					</label>
					<Dropdown
						value={memberRole}
						onChange={(e) => { setMemberRole(e.value as string) }}
						options={memberRoleOptions}
					/>
					{errors?.memberRole && <Message severity="error" text={errors.memberRole[0]} className="w-full mt-1" />}
				</div>

				<Button type="submit" label="Add" icon="pi pi-user-plus" />
			</Form>
		</Card>
	)
}

export default function TeamMembersPage({ loaderData, actionData }: Route.ComponentProps) {
	const { team, members, allUsers, canManage } = loaderData
	const addMemberErrors = actionData && "errors" in actionData
		? (actionData.errors as Record<string, string[] | undefined>)
		: undefined
	useActionToast(actionData as Parameters<typeof useActionToast>[0])
	useFlashToast()

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
		<div className="flex justify-end">
			<IconField iconPosition="left">
				<InputIcon className="pi pi-search" />
				<InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search members..." />
			</IconField>
		</div>
	)

	const flatMembers = members.map((m) => ({
		...m,
		fullName: m.user.fullName,
		email: m.user.email,
	}))

	return (
		<div>
			<Link
				to={`/teams/${team.id}`}
				viewTransition
				className="text-sm hover:underline mb-3 block"
				style={{ color: "var(--primary-color)" }}
			>
				← Back to team
			</Link>
			<h1 className="text-2xl font-bold mb-6">
				{team.name} — Members
			</h1>

			<div className="mb-6">
				<DataTable
					value={flatMembers}
					stripedRows
					emptyMessage="No members yet."
					paginator
					rows={10}
					rowsPerPageOptions={[5, 10, 25]}
					filters={filters}
					globalFilterFields={["fullName", "email", "memberRole"]}
					header={tableHeader}
					sortMode="single"
					removableSort
				>
					<Column field="fullName" header="Name" sortable />
					<Column field="email" header="Email" sortable />
					<Column
						field="memberRole"
						header="Role"
						sortable
						body={(m: (typeof flatMembers)[number]) => <span className="capitalize">{m.memberRole}</span>}
					/>
					{canManage && (
						<Column
							header=""
							body={(m: (typeof flatMembers)[number]) => (
								<Form method="post" style={{ display: "inline" }}>
									<input type="hidden" name="intent" value="remove-member" />
									<input type="hidden" name="userId" value={m.userId} />
									<Button
										type="submit"
										label="Remove"
										severity="danger"
										text
										size="small"
									/>
								</Form>
							)}
						/>
					)}
				</DataTable>
			</div>

			{canManage && allUsers.length > 0 && <AddMemberForm allUsers={allUsers} errors={addMemberErrors} />}
		</div>
	)
}
