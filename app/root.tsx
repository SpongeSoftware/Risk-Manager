import { authkitLoader } from "@workos-inc/authkit-react-router"
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

export async function loader(args: Route.LoaderArgs) {
	return authkitLoader(args)
}
import styles from "./styles/main.scss?url"
import tailwind from "./styles/tailwind.css?url"

/**
 * Returns the stylesheet `<link>` elements injected into every page's `<head>`.
 * Includes app styles, PrimeReact base CSS, PrimeIcons, and the initial lara-light-purple
 * theme (swapped at runtime by {@link useColorScheme}).
 */
export const meta: Route.MetaFunction = () => [{ title: "Risk Management" }]

export const links: Route.LinksFunction = () => [
	{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
	{ rel: "stylesheet", href: tailwind },
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

/**
 * HTML document shell shared by all routes.
 * Renders `<html>`, `<head>` (with meta, links), and `<body>` (with scroll restoration and scripts).
 *
 * @param props - Props injected by React Router.
 * @param props.children - The rendered route tree.
 */
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

/**
 * Root app component. Wraps the route outlet with TanStack Query and PrimeReact providers.
 * PrimeReact is initialised with `ripple: true` and `unstyled: false` to keep
 * the default PrimeReact styling active alongside Tailwind utility classes.
 */
export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<PrimeReactProvider value={{ ripple: true, unstyled: false }}>
				<Outlet />
			</PrimeReactProvider>
		</QueryClientProvider>
	)
}

/**
 * Top-level error boundary displayed when an unhandled error reaches the root.
 * Shows a 404 message for not-found responses, the error message in development,
 * or a generic fallback in production.
 *
 * @param props - Props injected by React Router containing the caught error.
 */
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
