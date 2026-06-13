import { createEnv } from "@t3-oss/env-core"
import { z } from "zod/v4"

/**
 * Validated, typed environment variables for the application.
 * Validated at startup using Zod via `@t3-oss/env-core` — the app throws a
 * clear error immediately if any required variable is missing or invalid.
 *
 * Server-side variables are never exposed to the browser. Client-side variables
 * must be prefixed with `VITE_` and are inlined into the client bundle at build time.
 */
export const env = createEnv({
	server: {
		APP_ENV: z.enum(["development", "test", "production"]).default("development"),
		TURSO_DATABASE_URL: z.string().min(1).default("file:./data/db.sqlite"),
		TURSO_AUTH_TOKEN: z.string().optional(),
		WORKOS_CLIENT_ID: z.string().min(1),
		WORKOS_API_KEY: z.string().min(1),
		WORKOS_REDIRECT_URI: z.url(),
		WORKOS_COOKIE_PASSWORD: z.string().min(32),
		BOOTSTRAP_ADMIN_EMAIL: z.email().optional(),
		SENTRY_DSN: z.url().optional(),
		SENTRY_ORG: z.string().optional(),
		SENTRY_PROJECT: z.string().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional(),
	},
	clientPrefix: "VITE_",
	client: {
		VITE_APP_ENV: z.enum(["development", "test", "production"]).default("development"),
	},
	runtimeEnv: {
		...process.env,
		VITE_APP_ENV: process.env.APP_ENV,
	},
})
