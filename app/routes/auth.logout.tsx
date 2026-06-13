import { signOut } from "@workos-inc/authkit-react-router"
import type { Route } from "./+types/auth.logout"

export async function action({ request }: Route.ActionArgs) {
	const url = new URL(request.url)
	const returnTo = url.origin + "/"
	return signOut(request, { returnTo })
}
