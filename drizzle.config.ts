import { defineConfig } from "drizzle-kit"

export default defineConfig({
	schema: "./app/server/schema.ts",
	out: "./drizzle",
	dialect: "turso",
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL ?? "file:./data/db.sqlite",
		authToken: process.env.TURSO_AUTH_TOKEN,
	},
})
