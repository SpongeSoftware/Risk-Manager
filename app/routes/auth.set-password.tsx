import { Button } from "primereact/button"
import { Password } from "primereact/password"
import { Form, data, redirect, useNavigation } from "react-router"
import { z } from "zod/v4"
import type { Route } from "./+types/auth.set-password"
import { setPasswordSchema } from "../lib/schemas/auth"
import { appendAudit } from "../server/queries/audits"
import { getUserByInviteTokenHash, setUserPassword } from "../server/queries/users"
import { hashPassword, hashToken } from "../server/password"
import { createSession } from "../server/session"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Set Password" }]

/** Resolves an invite token to its user, or `null` if unknown or expired. */
async function getInvitedUser(token: string | null) {
	if (!token) return null
	const user = await getUserByInviteTokenHash(hashToken(token))
	if (!user?.inviteTokenExpiresAt) return null
	if (user.inviteTokenExpiresAt < new Date().toISOString()) return null
	return user
}

export async function loader({ request }: Route.LoaderArgs) {
	const token = new URL(request.url).searchParams.get("token")
	const user = await getInvitedUser(token)
	// Echoing the token back is safe — it came from the requester's own URL.
	return { valid: user !== null, fullName: user?.fullName ?? null, token: user ? token : null }
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData))
	if (!parsed.success) {
		return data({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 })
	}

	const user = await getInvitedUser(parsed.data.token)
	if (!user) throw redirect("/set-password")

	// setUserPassword nulls the invite columns, so the token is single-use.
	await setUserPassword(user.id, await hashPassword(parsed.data.password), user.id)
	await appendAudit("user", user.id, "updated", user.id, { fieldChanged: "password" })

	const cookie = await createSession(user.id)
	throw redirect("/", { headers: { "Set-Cookie": cookie } })
}

export default function SetPasswordPage({ loaderData, actionData }: Route.ComponentProps) {
	const { valid, fullName, token } = loaderData
	const navigation = useNavigation()
	const submitting = navigation.state === "submitting"

	return (
		<div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
			<div className="w-full max-w-md p-8 bg-surface-0 dark:bg-surface-800 rounded-2xl shadow-lg">
				<div className="mb-6 text-center">
					<i className="pi pi-shield text-5xl text-purple-600 mb-4 block" />
					<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
						{valid ? `Welcome, ${fullName}` : "Invite link invalid"}
					</h1>
				</div>

				{!valid ? (
					<p className="text-surface-600 dark:text-surface-300 text-center">
						This invite link is invalid or has expired. Please ask your administrator to
						generate a new one.
					</p>
				) : (
					<Form method="post" className="flex flex-col gap-4">
						<input type="hidden" name="token" value={token ?? ""} />
						<div className="flex flex-col gap-1">
							<label htmlFor="password" className="text-sm font-medium text-surface-700 dark:text-surface-200">
								New password
							</label>
							<Password
								inputId="password"
								name="password"
								autoComplete="new-password"
								required
								toggleMask
								inputClassName="w-full"
								className="w-full"
								invalid={Boolean(actionData?.errors.password)}
							/>
							{actionData?.errors.password && (
								<small className="text-red-600 dark:text-red-400">
									{actionData.errors.password[0]}
								</small>
							)}
						</div>
						<div className="flex flex-col gap-1">
							<label htmlFor="confirmPassword" className="text-sm font-medium text-surface-700 dark:text-surface-200">
								Confirm password
							</label>
							<Password
								inputId="confirmPassword"
								name="confirmPassword"
								autoComplete="new-password"
								required
								feedback={false}
								toggleMask
								inputClassName="w-full"
								className="w-full"
								invalid={Boolean(actionData?.errors.confirmPassword)}
							/>
							{actionData?.errors.confirmPassword && (
								<small className="text-red-600 dark:text-red-400">
									{actionData.errors.confirmPassword[0]}
								</small>
							)}
						</div>
						<Button
							type="submit"
							label={submitting ? "Saving…" : "Set password and sign in"}
							icon="pi pi-check"
							disabled={submitting}
							className="w-full justify-center"
						/>
					</Form>
				)}
			</div>
		</div>
	)
}

