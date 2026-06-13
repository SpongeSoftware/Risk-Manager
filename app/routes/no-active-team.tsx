import { signOut } from "@workos-inc/authkit-react-router"
import { Button } from "primereact/button"
import type { Route } from "./+types/no-active-team"

export const meta: Route.MetaFunction = () => [{ title: "Risk Management — No Active Team" }]

export async function action({ request }: Route.ActionArgs) {
	return signOut(request)
}

export default function NoActiveTeamPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
			<div className="w-full max-w-md p-8 bg-surface-0 dark:bg-surface-800 rounded-2xl shadow-lg text-center">
				<i className="pi pi-lock text-5xl text-orange-500 mb-4 block" />
				<h1 className="text-2xl font-bold text-surface-900 dark:text-surface-0 mb-3">
					No Active Team
				</h1>
				<p className="text-surface-600 dark:text-surface-300 mb-6">
					You are not currently assigned to any active team. Please contact your supervisor or
					administrator.
				</p>
				<form method="post">
					<Button type="submit" label="Sign Out" icon="pi pi-sign-out" className="w-full" />
				</form>
			</div>
		</div>
	)
}
