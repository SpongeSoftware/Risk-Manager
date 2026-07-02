import { Button } from "primereact/button"
import { InputText } from "primereact/inputtext"
import { Password } from "primereact/password"
import { Form, data, redirect, useNavigation } from "react-router"
import { z } from "zod/v4"
import type { Route } from "./+types/auth.login"
import { loginSchema } from "../lib/schemas/auth"
import { burnPasswordCheck, verifyPassword } from "../server/password"
import { checkRateLimit, clearFailures, recordFailure } from "../server/rate-limit"
import { getUserByEmail } from "../server/queries/users"
import { createSession, getSessionUser } from "../server/session"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Sign In" }]

export async function loader({ request }: Route.LoaderArgs) {
	const user = await getSessionUser(request)
	if (user) throw redirect("/")
	return null
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const parsed = loginSchema.safeParse(Object.fromEntries(formData))
	if (!parsed.success) {
		return data({ errors: z.flattenError(parsed.error).fieldErrors, formError: null }, { status: 400 })
	}

	const { email, password } = parsed.data
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
	const emailKey = `email:${email.toLowerCase()}`
	const ipKey = `ip:${ip}`

	if (!checkRateLimit(emailKey) || !checkRateLimit(ipKey)) {
		return data(
			{ errors: null, formError: "Too many failed attempts. Please try again later." },
			{ status: 429 },
		)
	}

	const user = await getUserByEmail(email)
	// Users without a password (not yet invited) fail the same way as unknown
	// emails, and both paths cost one scrypt derivation so response timing
	// can't reveal which emails exist.
	const valid = user?.passwordHash
		? await verifyPassword(password, user.passwordHash)
		: (await burnPasswordCheck(password), false)

	if (!user || !valid) {
		recordFailure(emailKey)
		recordFailure(ipKey)
		return data({ errors: null, formError: "Invalid email or password." }, { status: 400 })
	}

	clearFailures(emailKey)
	clearFailures(ipKey)
	const cookie = await createSession(user.id)
	throw redirect("/", { headers: { "Set-Cookie": cookie } })
}

export default function LoginPage({ actionData }: Route.ComponentProps) {
	const navigation = useNavigation()
	const submitting = navigation.state === "submitting"

	return (
		<div
			className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
			style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80')" }}
		>
			<div className="absolute inset-0 bg-black/60" />
			<div className="relative z-10 w-full max-w-md p-8 bg-surface-0 dark:bg-surface-800 rounded-2xl shadow-lg">
				<div className="mb-6 text-center">
					<i className="pi pi-shield text-5xl text-purple-600 mb-4 block" />
					<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
						Risk Manager
					</h1>
					<p className="text-surface-600 dark:text-surface-300 mt-2">
						ISO 27001 &amp; SOC2 Risk Assessment Platform
					</p>
				</div>

				{actionData?.formError && (
					<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300 text-sm">
						{actionData.formError}
					</div>
				)}

				<Form method="post" className="flex flex-col gap-4">
					<div className="flex flex-col gap-1 text-left">
						<label htmlFor="email" className="text-sm font-medium text-surface-700 dark:text-surface-200">
							Email
						</label>
						<InputText
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							invalid={Boolean(actionData?.errors?.email)}
						/>
						{actionData?.errors?.email && (
							<small className="text-red-600 dark:text-red-400">{actionData.errors.email[0]}</small>
						)}
					</div>

					<div className="flex flex-col gap-1 text-left">
						<label htmlFor="password" className="text-sm font-medium text-surface-700 dark:text-surface-200">
							Password
						</label>
						<Password
							inputId="password"
							name="password"
							autoComplete="current-password"
							required
							feedback={false}
							toggleMask
							inputClassName="w-full"
							className="w-full"
							invalid={Boolean(actionData?.errors?.password)}
						/>
						{actionData?.errors?.password && (
							<small className="text-red-600 dark:text-red-400">{actionData.errors.password[0]}</small>
						)}
					</div>

					<Button
						type="submit"
						label={submitting ? "Signing in…" : "Sign in"}
						icon="pi pi-sign-in"
						disabled={submitting}
						className="w-full justify-center"
					/>
				</Form>
			</div>
		</div>
	)
}
