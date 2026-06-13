import { riskLevel } from "../../lib/formatters"

interface RiskMatrixProps {
	items: Array<{ likelihood: number; impact: number; riskScore: number }>
}

const cellStyles: Record<string, React.CSSProperties> = {
	low:      { background: "var(--green-100)",  color: "var(--green-700)" },
	medium:   { background: "var(--yellow-100)", color: "var(--yellow-700)" },
	high:     { background: "var(--orange-100)", color: "var(--orange-700)" },
	critical: { background: "var(--red-100)",    color: "var(--red-700)" },
}

const likelihoods = [5, 4, 3, 2, 1]
const impacts = [1, 2, 3, 4, 5]

export function RiskMatrix({ items }: RiskMatrixProps) {
	function countAt(l: number, i: number) {
		return items.filter((r) => r.likelihood === l && r.impact === i).length
	}

	return (
		<div className="flex gap-2 items-start">
			{/* Y-axis label */}
			<div className="flex items-center justify-center" style={{ width: "1.25rem", alignSelf: "stretch" }}>
				<span
					className="text-xs text-surface-500 font-medium select-none whitespace-nowrap"
					style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
				>
					Likelihood
				</span>
			</div>

			<div>
				{/* Column headers */}
				<div className="grid mb-1" style={{ gridTemplateColumns: "2rem repeat(5, 3rem)" }}>
					<div />
					{impacts.map((i) => (
						<div key={i} className="text-center text-xs text-surface-500 font-medium">{i}</div>
					))}
				</div>

				{/* Rows */}
				{likelihoods.map((l) => (
					<div key={l} className="grid mb-1" style={{ gridTemplateColumns: "2rem repeat(5, 3rem)" }}>
						<div className="text-center text-xs text-surface-500 font-medium self-center">{l}</div>
						{impacts.map((i) => {
							const score = l * i
							const level = riskLevel(score)
							const count = countAt(l, i)
							return (
								<div
									key={i}
									className="h-12 rounded flex flex-col items-center justify-center text-xs font-bold mx-0.5"
									style={cellStyles[level]}
								>
									<span>{score}</span>
									{count > 0 && (
										<span
											className="rounded-full text-white flex items-center justify-center mt-0.5"
											style={{
												background: "var(--surface-900)",
												minWidth: "1.1rem",
												height: "1.1rem",
												fontSize: "0.65rem",
											}}
										>
											{count}
										</span>
									)}
								</div>
							)
						})}
					</div>
				))}

				{/* X-axis label */}
				<div
					className="text-center text-xs text-surface-500 font-medium mt-1"
					style={{ gridColumn: "2 / -1", paddingLeft: "2rem" }}
				>
					Impact
				</div>
			</div>
		</div>
	)
}
