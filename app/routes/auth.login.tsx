import { getSignInUrl } from "@workos-inc/authkit-react-router"
import { data } from "react-router"
import type { Route } from "./+types/auth.login"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — Sign In" }]

export async function loader({ request }: Route.LoaderArgs) {
	const error = new URL(request.url).searchParams.get("error")
	const { url, headers } = await getSignInUrl("/", request)
	return data({ signInUrl: url, error }, { headers })
}

export default function LoginPage({ loaderData }: Route.ComponentProps) {
	const { signInUrl, error } = loaderData

	return (
		<div
			className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
			style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80')" }}
		>
			<div className="absolute inset-0 bg-black/60" />
			<div className="relative z-10 w-full max-w-md p-8 bg-surface-0 dark:bg-surface-800 rounded-2xl shadow-lg text-center">
				<div className="mb-6">
					<i className="pi pi-shield text-5xl text-purple-600 mb-4 block" />
					<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0">
						Risk Manager
					</h1>
					<p className="text-surface-600 dark:text-surface-300 mt-2">
						ISO 27001 &amp; SOC2 Risk Assessment Platform
					</p>
				</div>

				{error === "not_provisioned" && (
					<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300 text-sm">
						Your account has not been set up yet. Please contact your administrator.
					</div>
				)}

				<a href={signInUrl} className="block w-full p-button p-component p-button-primary justify-center">
					<i className="p-button-icon pi pi-sign-in mr-2" />
					<span className="p-button-label">Sign in</span>
				</a>
			</div>
		</div>
	)
}
