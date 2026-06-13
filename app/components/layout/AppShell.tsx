import { useRef, useEffect } from "react"
import { useSelector } from "@tanstack/react-store"
import { Toast } from "primereact/toast"
import type { User } from "../../server/schema"
import { appStore, dismissToast } from "../../store"
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
	const collapsed = useSelector(appStore, (s) => s.sidebarCollapsed)
	const toasts = useSelector(appStore, (s) => s.toasts)
	const toastRef = useRef<Toast>(null)
	const shownIds = useRef(new Set<string>())
	useColorScheme()

	useEffect(() => {
		toasts.forEach((t) => {
			if (!shownIds.current.has(t.id)) {
				shownIds.current.add(t.id)
				toastRef.current?.show({
					severity: t.severity,
					summary: t.summary,
					detail: t.detail,
					life: 4000,
				})
			}
		})
	}, [toasts])

	return (
		<div className="app-shell">
			<Toast ref={toastRef} onRemove={(msg) => { if (msg.id) dismissToast(msg.id) }} />
			<Sidebar user={user} collapsed={collapsed} />
			<div className="main-content">
				<TopBar user={user} />
				<main className="page-content">{children}</main>
			</div>
		</div>
	)
}
