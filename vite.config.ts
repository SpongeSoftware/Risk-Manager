import { reactRouter } from "@react-router/dev/vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

const isProd = process.env.APP_ENV === "production"

export default defineConfig({
	build: {
		sourcemap: isProd,
	},
	resolve: {
		tsconfigPaths: true,
	},
	ssr: {
		noExternal: ["primereact"],
	},
	plugins: [
		tailwindcss(),
		reactRouter(),
		isProd &&
			sentryVitePlugin({
				org: process.env.SENTRY_ORG,
				project: process.env.SENTRY_PROJECT,
				authToken: process.env.SENTRY_AUTH_TOKEN,
			}),
	],
})
