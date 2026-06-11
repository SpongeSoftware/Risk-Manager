import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PrimeReactProvider } from "primereact/api"
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router"
import type { Route } from "./+types/root"
import styles from "./styles/main.scss?url"

export const links: Route.LinksFunction = () => [
	{ rel: "stylesheet", href: styles },
	{ rel: "stylesheet", href: "/primereact.min.css" },
	{ rel: "stylesheet", href: "/primeicons.css" },
	{
		id: "primereact-theme",
		rel: "stylesheet",
		href: "/themes/lara-light-purple/theme.css",
	},
]

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 30_000 },
	},
})

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<PrimeReactProvider value={{ ripple: true, unstyled: false }}>
				<Outlet />
			</PrimeReactProvider>
		</QueryClientProvider>
	)
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!"
	let details = "An unexpected error occurred."
	let stack: string | undefined

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error"
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details
	} else if (import.meta.env.DEV && error instanceof Error) {
		details = error.message
		stack = error.stack
	}

	return (
		<main className="p-8 max-w-2xl mx-auto">
			<h1 className="text-3xl font-bold mb-4">{message}</h1>
			<p className="text-lg mb-4">{details}</p>
			{stack && (
				<pre className="p-4 bg-surface-100 rounded overflow-x-auto text-sm">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	)
}
