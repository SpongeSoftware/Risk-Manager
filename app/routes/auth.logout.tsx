import { redirect } from "react-router"
import type { Route } from "./+types/auth.logout"
import { destroySession } from "../server/session"

export async function action({ request }: Route.ActionArgs) {
	const cookie = await destroySession(request)
	return redirect("/login", { headers: { "Set-Cookie": cookie } })
}
