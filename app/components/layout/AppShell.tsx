import { useStore } from "@tanstack/react-store"
import type { User } from "../../server/schema"
import { appStore } from "../../store"
import { useColorScheme } from "../../hooks/useColorScheme"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"

interface AppShellProps {
	user: User
	children: React.ReactNode
}

/**
 * Root layout wrapper for all authenticated pages.
 * Composes the {@link Sidebar}, {@link TopBar}, and a scrollable `<main>` content area.
 * Also mounts {@link useColorScheme} to drive DOM theme synchronisation.
 *
 * @param props - Component props.
 * @param props.user - The authenticated user, passed down to Sidebar and TopBar.
 * @param props.children - The active route's page content rendered in the main area.
 */
export function AppShell({ user, children }: AppShellProps) {
	const collapsed = useStore(appStore, (s) => s.sidebarCollapsed)
	useColorScheme()

	return (
		<div className="app-shell">
			<Sidebar user={user} collapsed={collapsed} />
			<div className="main-content">
				<TopBar user={user} />
				<main className="page-content">{children}</main>
			</div>
		</div>
	)
}
