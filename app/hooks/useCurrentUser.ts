import { useRouteLoaderData } from "react-router"
import type { User } from "../server/schema"

/**
 * Returns the authenticated user record loaded by the `_app` layout route.
 * Must be called within a route rendered inside the `_app` layout — throws
 * an error if used outside that context.
 *
 * @returns The current user's database record.
 * @throws {Error} If called outside the `_app` layout route tree.
 */
export function useCurrentUser(): User {
	const data = useRouteLoaderData("routes/_app") as { user: User } | undefined
	if (!data?.user) throw new Error("useCurrentUser must be used inside the _app layout route")
	return data.user
}
