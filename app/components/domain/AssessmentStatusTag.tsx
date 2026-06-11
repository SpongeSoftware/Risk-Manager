type Status = "draft" | "submitted" | "reviewed" | "approved"

const styles: Record<Status, string> = {
	draft: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
	submitted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
	reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
	approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
}

interface AssessmentStatusTagProps {
	/** The current workflow status of the assessment. */
	status: Status
}

/**
 * Displays a colour-coded inline tag for an assessment's workflow status.
 * Colours: Draft (grey) · Submitted (yellow) · Reviewed (blue) · Approved (green).
 *
 * @param props - Component props.
 * @param props.status - One of `"draft"`, `"submitted"`, `"reviewed"`, or `"approved"`.
 */
export function AssessmentStatusTag({ status }: AssessmentStatusTagProps) {
	return (
		<span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[status]}`}>
			{status}
		</span>
	)
}
