import { authLoader } from "@workos-inc/authkit-react-router"
import { redirect } from "react-router"

export const loader = authLoader({ returnPathname: "/" })

export function ErrorBoundary() {
	throw redirect("/login?error=callback_failed")
}
