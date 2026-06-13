import { authkitLoader } from "@workos-inc/authkit-react-router"
import { Outlet } from "react-router"
import type { Route } from "./+types/app"
import { AppShell } from "../components/layout/AppShell"
import { requireActiveTeam } from "../server/auth"

export async function loader(args: Route.LoaderArgs) {
	return authkitLoader(args, async ({ request }: { request: Request }) => {
		const currentUser = await requireActiveTeam(request)
		return { currentUser }
	})
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
	return (
		<AppShell user={loaderData.currentUser}>
			<Outlet />
		</AppShell>
	)
}
