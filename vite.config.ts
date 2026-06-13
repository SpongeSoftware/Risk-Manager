import { reactRouter } from "@react-router/dev/vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

const isProd = process.env["APP_ENV"] === "production"

export default defineConfig({
	build: {
		sourcemap: isProd,
	},
	ssr: {
		noExternal: ["primereact"],
	},
	plugins: [
		tailwindcss(),
		reactRouter(),
		tsconfigPaths(),
		isProd &&
			sentryVitePlugin({
				org: process.env["SENTRY_ORG"],
				project: process.env["SENTRY_PROJECT"],
				authToken: process.env["SENTRY_AUTH_TOKEN"],
			}),
	],
})
