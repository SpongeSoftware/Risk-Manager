type Framework = "ISO27001" | "SOC2" | "BOTH"

const styles: Record<Framework, string> = {
	ISO27001: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
	SOC2: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
	BOTH: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
}

const labels: Record<Framework, string> = {
	ISO27001: "ISO 27001",
	SOC2: "SOC 2",
	BOTH: "ISO 27001 + SOC 2",
}

interface FrameworkTagProps {
	framework: Framework
}

export function FrameworkTag({ framework }: FrameworkTagProps) {
	return (
		<span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${styles[framework]}`}>
			{labels[framework]}
		</span>
	)
}
