import { riskLevel, riskLevelLabel } from "../../lib/formatters"

interface RiskScoreBadgeProps {
	/** Risk score in the range 1–25 (likelihood × impact). */
	score: number
}

const styleMap: Record<string, React.CSSProperties> = {
	low:      { background: "var(--green-100)", color: "var(--green-700)" },
	medium:   { background: "var(--yellow-100)", color: "var(--yellow-700)" },
	high:     { background: "var(--orange-100)", color: "var(--orange-700)" },
	critical: { background: "var(--red-100)", color: "var(--red-700)" },
}

export function RiskScoreBadge({ score }: RiskScoreBadgeProps) {
	const level = riskLevel(score)
	return (
		<span
			className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
			style={styleMap[level]}
		>
			<span className="font-bold">{score}</span>
			<span>{riskLevelLabel(score)}</span>
		</span>
	)
}
