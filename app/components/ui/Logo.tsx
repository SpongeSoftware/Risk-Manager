interface LogoProps {
	className?: string
}

export function LogoIcon({ className }: LogoProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			aria-hidden="true"
		>
			<path
				d="M12 2L3 7v5c0 5.25 3.9 10.15 9 11.35C17.1 22.15 21 17.25 21 12V7L12 2z"
				fill="#8b5cf6"
			/>
			<path
				d="M9 12l2 2 4-4"
				stroke="white"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export function Logo({ className }: LogoProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 200 40"
			fill="none"
			className={className}
			aria-label="Risk Manager"
		>
			<path
				d="M20 4L7 9.5v5c0 6.56 4.88 12.69 11.25 14.19C24.62 27.19 29.5 21.06 29.5 14.5v-5L20 4z"
				fill="#8b5cf6"
			/>
			<path
				d="M15.5 14.5l2.5 2.5 5-5"
				stroke="white"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<text
				x="38"
				y="26"
				fontFamily="Inter, system-ui, sans-serif"
				fontSize="16"
				fontWeight="700"
				fill="currentColor"
			>
				Risk Manager
			</text>
		</svg>
	)
}
