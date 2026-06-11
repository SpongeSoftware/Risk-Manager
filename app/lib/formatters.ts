/**
 * Formats an ISO date string to a short date in Australian locale format.
 * Returns an em-dash when the value is null or undefined.
 *
 * @param iso - An ISO 8601 date string, or null/undefined.
 * @returns A formatted string such as `"15 Jun 2025"`, or `"—"` if no value.
 *
 * @example
 * formatDate("2025-06-15T10:30:00Z") // "15 Jun 2025"
 * formatDate(null)                    // "—"
 */
export function formatDate(iso: string | null | undefined): string {
	if (!iso) return "—"
	return new Intl.DateTimeFormat("en-AU", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(iso))
}

/**
 * Formats an ISO date string to a date and time in Australian locale format.
 * Returns an em-dash when the value is null or undefined.
 *
 * @param iso - An ISO 8601 date string, or null/undefined.
 * @returns A formatted string such as `"15 Jun 2025, 10:30 am"`, or `"—"` if no value.
 *
 * @example
 * formatDateTime("2025-06-15T10:30:00Z") // "15 Jun 2025, 10:30 am"
 * formatDateTime(undefined)               // "—"
 */
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

/**
 * Maps a numeric risk score (1–25) to a criticality level.
 * Thresholds align with the 5×5 risk matrix used in ISO 27001 assessments.
 *
 * @param score - Risk score in the range 1–25 (likelihood × impact).
 * @returns `"low"` (≤4), `"medium"` (≤9), `"high"` (≤16), or `"critical"` (>16).
 *
 * @example
 * riskLevel(3)  // "low"
 * riskLevel(8)  // "medium"
 * riskLevel(15) // "high"
 * riskLevel(20) // "critical"
 */
export function riskLevel(score: number): "low" | "medium" | "high" | "critical" {
	if (score <= 4) return "low"
	if (score <= 9) return "medium"
	if (score <= 16) return "high"
	return "critical"
}

/**
 * Returns the capitalised label for a risk score's criticality level.
 *
 * @param score - Risk score in the range 1–25.
 * @returns A string such as `"Low"`, `"Medium"`, `"High"`, or `"Critical"`.
 *
 * @example
 * riskLevelLabel(3)  // "Low"
 * riskLevelLabel(20) // "Critical"
 */
export function riskLevelLabel(score: number): string {
	return riskLevel(score).charAt(0).toUpperCase() + riskLevel(score).slice(1)
}
