import { useEffect } from "react"
import { useSearchParams } from "react-router"
import { pushToast } from "../store"
import type { ToastMessage } from "../store"

export function useFlashToast() {
	const [searchParams, setSearchParams] = useSearchParams()
	useEffect(() => {
		const severity = searchParams.get("toastSeverity") as ToastMessage["severity"] | null
		const summary = searchParams.get("toastSummary")
		if (severity && summary) {
			pushToast({ severity, summary })
			const next = new URLSearchParams(searchParams)
			next.delete("toastSeverity")
			next.delete("toastSummary")
			setSearchParams(next, { replace: true })
		}
	}, [searchParams, setSearchParams])
}
