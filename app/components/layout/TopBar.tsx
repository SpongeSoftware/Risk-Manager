import { Form } from "react-router"
import { Button } from "primereact/button"
import type { User } from "../../server/schema"
import { getRoleLabel } from "../../lib/roles"
import { setColorScheme, appStore } from "../../store"
import { useStore } from "@tanstack/react-store"
import type { ColorScheme } from "../../store"

interface TopBarProps {
	user: User
}

const schemeOptions: { value: ColorScheme; icon: string; label: string }[] = [
	{ value: "light", icon: "pi pi-sun", label: "Light" },
	{ value: "system", icon: "pi pi-desktop", label: "System" },
	{ value: "dark", icon: "pi pi-moon", label: "Dark" },
]

/**
 * Application header bar rendered at the top of every protected page.
 * Contains:
 * - A 3-way Light / System / Dark theme toggle that writes to the app store
 * - The signed-in user's full name and role label
 * - A sign-out button that POSTs to `/logout`
 *
 * @param props - Component props.
 * @param props.user - The authenticated user record used for name and role display.
 */
export function TopBar({ user }: TopBarProps) {
	const colorScheme = useStore(appStore, (s) => s.colorScheme)

	return (
		<header className="topbar border-b flex items-center justify-between px-6">
			<h2 className="topbar-title text-lg font-semibold">
				Risk Assessment Platform
			</h2>

			<div className="flex items-center gap-4">
				{/* Theme toggle */}
				<div className="theme-switcher flex gap-1 rounded-lg p-1">
					{schemeOptions.map((opt) => (
						<Button
							key={opt.value}
							type="button"
							icon={opt.icon}
							text
							rounded
							size="small"
							title={opt.label}
							onClick={() => setColorScheme(opt.value)}
							className={`theme-btn${colorScheme === opt.value ? " active" : ""}`}
							aria-label={opt.label}
						/>
					))}
				</div>

				{/* User info + sign out */}
				<div className="flex items-center gap-3">
					<div className="text-right">
						<p className="topbar-username text-sm font-medium">
							{user.fullName}
						</p>
						<p className="topbar-role text-xs">{getRoleLabel(user.role)}</p>
					</div>
					<Form action="/logout" method="post">
						<Button
							type="submit"
							icon="pi pi-sign-out"
							severity="secondary"
							text
							rounded
							aria-label="Sign out"
							size="small"
						/>
					</Form>
				</div>
			</div>
		</header>
	)
}
