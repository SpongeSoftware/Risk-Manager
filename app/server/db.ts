import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

/**
 * Drizzle ORM client connected to Turso (libsql).
 * Falls back to a local SQLite file at `./data/db.sqlite` when
 * `TURSO_DATABASE_URL` is not set, which is the default for development.
 */
export const db = drizzle(
	createClient({
		url: process.env["TURSO_DATABASE_URL"] ?? "file:./data/db.sqlite",
		authToken: process.env["TURSO_AUTH_TOKEN"],
	}),
	{ schema },
)
