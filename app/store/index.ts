import { Store } from "@tanstack/react-store"

export type ColorScheme = "light" | "dark" | "system"

export interface ToastMessage {
	id: string
	severity: "success" | "error" | "info" | "warn"
	summary: string
	detail?: string
}

export interface AppState {
	sidebarCollapsed: boolean
	teamsShowInactive: boolean
	toasts: ToastMessage[]
	editingRiskItemId: number | null
	colorScheme: ColorScheme
}

function getInitialColorScheme(): ColorScheme {
	if (typeof window === "undefined") return "system"
	const stored = localStorage.getItem("colorScheme") as ColorScheme | null
	return stored ?? "system"
}

export const appStore = new Store<AppState>({
	sidebarCollapsed: false,
	teamsShowInactive: false,
	toasts: [],
	editingRiskItemId: null,
	colorScheme: getInitialColorScheme(),
})

export function toggleSidebar() {
	appStore.setState((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }))
}

export function toggleInactiveTeams() {
	appStore.setState((s) => ({ ...s, teamsShowInactive: !s.teamsShowInactive }))
}

export function setColorScheme(scheme: ColorScheme) {
	if (typeof window !== "undefined") {
		localStorage.setItem("colorScheme", scheme)
	}
	appStore.setState((s) => ({ ...s, colorScheme: scheme }))
}

export function pushToast(msg: Omit<ToastMessage, "id">) {
	const id = crypto.randomUUID()
	appStore.setState((s) => ({ ...s, toasts: [...s.toasts, { ...msg, id }] }))
}

export function dismissToast(id: string) {
	appStore.setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }))
}

export function setEditingRiskItem(id: number | null) {
	appStore.setState((s) => ({ ...s, editingRiskItemId: id }))
}
