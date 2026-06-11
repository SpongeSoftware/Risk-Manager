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
		<header className="topbar bg-surface-0 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-6">
			<h2 className="text-lg font-semibold text-surface-700 dark:text-surface-200">
				Risk Assessment Platform
			</h2>

			<div className="flex items-center gap-4">
				{/* Theme toggle */}
				<div className="flex gap-1 bg-surface-100 dark:bg-surface-700 rounded-lg p-1">
					{schemeOptions.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => setColorScheme(opt.value)}
							title={opt.label}
							className={`p-2 rounded transition-colors ${
								colorScheme === opt.value
									? "bg-purple-600 text-white"
									: "text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
							}`}
						>
							<i className={opt.icon} />
						</button>
					))}
				</div>

				{/* User info + sign out */}
				<div className="flex items-center gap-3">
					<div className="text-right">
						<p className="text-sm font-medium text-surface-900 dark:text-surface-0">
							{user.fullName}
						</p>
						<p className="text-xs text-surface-500">{getRoleLabel(user.role)}</p>
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
