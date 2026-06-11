import { useRouteLoaderData } from "react-router"
import type { User } from "../server/schema"

export function useCurrentUser(): User {
	const data = useRouteLoaderData("routes/_app") as { user: User } | undefined
	if (!data?.user) throw new Error("useCurrentUser must be used inside the _app layout route")
	return data.user
}
