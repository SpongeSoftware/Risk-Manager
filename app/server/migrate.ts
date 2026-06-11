import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import { mkdirSync } from "fs"
import { Role } from "./schema.ts"

const url = process.env["TURSO_DATABASE_URL"] ?? "file:./data/db.sqlite"
if (url.startsWith("file:")) {
	mkdirSync("./data", { recursive: true })
}

const client = createClient({
	url,
	authToken: process.env["TURSO_AUTH_TOKEN"],
})
const db = drizzle(client)

await migrate(db, { migrationsFolder: "./drizzle" })

const now = new Date().toISOString()
await client.execute({
	sql: `INSERT OR IGNORE INTO users (id, workos_id, full_name, email, student_id, role, created_by, created_date, modified_by, modified_date)
        VALUES ('system', NULL, 'System', NULL, NULL, ?, 'system', ?, 'system', ?)`,
	args: [Role.Admin, now, now],
})

console.log("Migrations applied and system user seeded")
client.close()
