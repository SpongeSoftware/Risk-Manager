import { Outlet } from "react-router"
import type { Route } from "./+types/app"
import { AppShell } from "../components/layout/AppShell"
import { requireActiveTeam } from "../server/auth"

export async function loader({ request }: Route.LoaderArgs) {
	const currentUser = await requireActiveTeam(request)
	return { currentUser }
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
	return (
		<AppShell user={loaderData.currentUser}>
			<Outlet />
		</AppShell>
	)
}
