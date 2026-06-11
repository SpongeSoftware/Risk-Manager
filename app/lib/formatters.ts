export function formatDate(iso: string | null | undefined): string {
	if (!iso) return "—"
	return new Intl.DateTimeFormat("en-AU", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(iso))
}

export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return "—"
	return new Intl.DateTimeFormat("en-AU", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(iso))
}

export function riskLevel(score: number): "low" | "medium" | "high" | "critical" {
	if (score <= 4) return "low"
	if (score <= 9) return "medium"
	if (score <= 16) return "high"
	return "critical"
}

export function riskLevelLabel(score: number): string {
	return riskLevel(score).charAt(0).toUpperCase() + riskLevel(score).slice(1)
}
