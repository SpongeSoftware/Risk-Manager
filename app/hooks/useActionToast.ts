import { useEffect, useRef } from "react"
import { pushToast } from "../store"
import type { ToastMessage } from "../store"

export function useActionToast(data: { toast?: Omit<ToastMessage, "id"> } | null | undefined) {
	const prev = useRef(data)
	useEffect(() => {
		if (data && data !== prev.current && data.toast) {
			pushToast(data.toast)
		}
		prev.current = data
	}, [data])
}
