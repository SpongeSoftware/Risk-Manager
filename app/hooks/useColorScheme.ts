import { useStore } from "@tanstack/react-store"
import { useEffect } from "react"
import { setColorScheme, appStore, type ColorScheme } from "../store"

const LIGHT_THEME = "/themes/lara-light-purple/theme.css"
const DARK_THEME = "/themes/lara-dark-purple/theme.css"

export function useColorScheme() {
	const colorScheme = useStore(appStore, (s) => s.colorScheme)

	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)")

		function apply(scheme: ColorScheme) {
			const isDark = scheme === "dark" || (scheme === "system" && mq.matches)
			const href = isDark ? DARK_THEME : LIGHT_THEME

			const link = document.getElementById("primereact-theme") as HTMLLinkElement | null
			if (link && link.getAttribute("href") !== href) {
				link.href = href
			}

			if (isDark) {
				document.documentElement.classList.add("dark")
			} else {
				document.documentElement.classList.remove("dark")
			}
		}

		apply(colorScheme)

		function onSystemChange() {
			if (appStore.state.colorScheme === "system") apply("system")
		}

		mq.addEventListener("change", onSystemChange)
		return () => mq.removeEventListener("change", onSystemChange)
	}, [colorScheme])

	return { colorScheme, setColorScheme }
}
