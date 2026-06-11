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
