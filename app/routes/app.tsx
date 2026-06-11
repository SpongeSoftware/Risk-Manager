import { authkitLoader } from "@workos-inc/authkit-react-router"
import { Outlet } from "react-router"
import type { Route } from "./+types/app"
import { AppShell } from "../components/layout/AppShell"
import { requireActiveTeam } from "../server/auth"

export async function loader(args: Route.LoaderArgs) {
	return authkitLoader(args, async ({ request }: { request: Request }) => {
		const user = await requireActiveTeam(request)
		return { user }
	})
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
	return (
		<AppShell user={loaderData.user}>
			<Outlet />
		</AppShell>
	)
}
