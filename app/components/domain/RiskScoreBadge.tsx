import { riskLevel, riskLevelLabel } from "../../lib/formatters"

interface RiskScoreBadgeProps {
	/** Risk score in the range 1–25 (likelihood × impact). */
	score: number
}

const colorMap = {
	low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
	medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
	high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
	critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
} as const

/**
 * Displays a colour-coded pill badge showing a risk score and its criticality level.
 * Colour thresholds: Low (green, ≤4) · Medium (yellow, ≤9) · High (orange, ≤16) · Critical (red, >16).
 *
 * @param props - Component props.
 * @param props.score - Risk score in the range 1–25.
 */
export function RiskScoreBadge({ score }: RiskScoreBadgeProps) {
	const level = riskLevel(score)
	return (
		<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colorMap[level]}`}>
			<span className="font-bold">{score}</span>
			<span>{riskLevelLabel(score)}</span>
		</span>
	)
}
