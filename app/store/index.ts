import { Store } from "@tanstack/react-store"

/** The user's preferred colour scheme. `"system"` follows the OS preference. */
export type ColorScheme = "light" | "dark" | "system"

/** A single toast notification queued for display. */
export interface ToastMessage {
	/** Unique identifier used to dismiss this specific toast. */
	id: string
	severity: "success" | "error" | "info" | "warn"
	/** Short heading text displayed in the toast. */
	summary: string
	/** Optional longer body text displayed beneath the summary. */
	detail?: string
}

/** Global client-side UI state managed by TanStack Store. */
export interface AppState {
	/** Whether the navigation sidebar is collapsed to icon-only mode. */
	sidebarCollapsed: boolean
	/** Whether the mobile sidebar drawer is open. */
	sidebarMobileOpen: boolean
	/** When `true`, the sidebar teams list includes inactive semester teams. Supervisor-facing toggle. */
	teamsShowInactive: boolean
	/** Queue of pending toast notifications. */
	toasts: ToastMessage[]
	/** ID of the risk item currently being edited inline, or `null` when none. */
	editingRiskItemId: number | null
	/** Active colour scheme. Persisted to `localStorage` and restored on page load. */
	colorScheme: ColorScheme
}

function getInitialColorScheme(): ColorScheme {
	if (typeof window === "undefined") return "system"
	const stored = localStorage.getItem("colorScheme") as ColorScheme | null
	return stored ?? "system"
}

/** The singleton TanStack Store instance holding all client UI state. */
export const appStore = new Store<AppState>({
	sidebarCollapsed: false,
	sidebarMobileOpen: false,
	teamsShowInactive: false,
	toasts: [],
	editingRiskItemId: null,
	colorScheme: getInitialColorScheme(),
})

/**
 * Toggles the sidebar between expanded and icon-only collapsed mode.
 */
export function toggleSidebar() {
	appStore.setState((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }))
}

/** Opens the mobile sidebar drawer. */
export function openMobileSidebar() {
	appStore.setState((s) => ({ ...s, sidebarMobileOpen: true }))
}

/** Closes the mobile sidebar drawer. */
export function closeMobileSidebar() {
	appStore.setState((s) => ({ ...s, sidebarMobileOpen: false }))
}

/**
 * Toggles whether inactive-semester teams are shown in the sidebar team list.
 */
export function toggleInactiveTeams() {
	appStore.setState((s) => ({ ...s, teamsShowInactive: !s.teamsShowInactive }))
}

/**
 * Sets the active colour scheme and persists the choice to `localStorage`
 * so it survives page reloads.
 *
 * @param scheme - `"light"`, `"dark"`, or `"system"` to follow the OS preference.
 */
export function setColorScheme(scheme: ColorScheme) {
	if (typeof window !== "undefined") {
		localStorage.setItem("colorScheme", scheme)
	}
	appStore.setState((s) => ({ ...s, colorScheme: scheme }))
}

/**
 * Adds a toast notification to the display queue. An `id` is generated automatically.
 *
 * @param msg - Toast payload without `id` — provide `severity`, `summary`, and optional `detail`.
 */
export function pushToast(msg: Omit<ToastMessage, "id">) {
	const id = crypto.randomUUID()
	appStore.setState((s) => ({ ...s, toasts: [...s.toasts, { ...msg, id }] }))
}

/**
 * Removes a toast notification from the queue by its ID.
 *
 * @param id - The `id` of the toast to remove.
 */
export function dismissToast(id: string) {
	appStore.setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }))
}

/**
 * Sets the ID of the risk item currently being edited inline.
 *
 * @param id - The risk item's numeric ID, or `null` to clear the inline edit state.
 */
export function setEditingRiskItem(id: number | null) {
	appStore.setState((s) => ({ ...s, editingRiskItemId: id }))
}
