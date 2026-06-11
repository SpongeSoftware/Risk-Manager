import { getSignInUrl } from "@workos-inc/authkit-react-router"
import { data } from "react-router"
import type { Route } from "./+types/auth.login"

export async function loader({ request }: Route.LoaderArgs) {
	const error = new URL(request.url).searchParams.get("error")
	const { url, headers } = await getSignInUrl("/", request)
	return data({ signInUrl: url, error }, { headers })
}

export default function LoginPage({ loaderData }: Route.ComponentProps) {
	const { signInUrl, error } = loaderData

	return (
		<div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
			<div className="w-full max-w-md p-8 bg-surface-0 dark:bg-surface-800 rounded-2xl shadow-lg text-center">
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

				<a
					href={signInUrl}
					className="block w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
				>
					Sign in with WorkOS
				</a>
			</div>
		</div>
	)
}
