import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import { mkdirSync } from "fs"
import { hashPassword } from "./password.ts"
import { Role } from "./schema.ts"

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/db.sqlite"
if (url.startsWith("file:")) {
	mkdirSync("./data", { recursive: true })
}

const client = createClient({
	url,
	authToken: process.env.TURSO_AUTH_TOKEN,
})
const db = drizzle(client)

await migrate(db, { migrationsFolder: "./drizzle" })

const now = new Date().toISOString()
await client.execute({
	sql: `INSERT OR IGNORE INTO users (id, full_name, email, student_id, role, created_by, created_date, modified_by, modified_date)
        VALUES ('system', 'System', NULL, NULL, ?, 'system', ?, 'system', ?)`,
	args: [Role.Admin, now, now],
})

// Bootstrap admin: seeded here (not claimable at login) so the first admin's
// identity is fixed by whoever controls the environment, not by whoever
// reaches /login first.
const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL
const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD
if (bootstrapEmail && bootstrapPassword) {
	const existing = await client.execute({
		sql: "SELECT id, password_hash FROM users WHERE email = ? AND deleted_at IS NULL",
		args: [bootstrapEmail],
	})
	if (existing.rows.length === 0) {
		const passwordHash = await hashPassword(bootstrapPassword)
		await client.execute({
			sql: `INSERT INTO users (id, full_name, email, role, password_hash, created_by, created_date, modified_by, modified_date)
	        VALUES (?, ?, ?, ?, ?, 'system', ?, 'system', ?)`,
			args: [crypto.randomUUID(), bootstrapEmail, bootstrapEmail, Role.Admin, passwordHash, now, now],
		})
		console.log(`Bootstrap admin seeded: ${bootstrapEmail}`)
	} else if (existing.rows[0].password_hash === null) {
		// Pre-existing bootstrap account with no password yet (e.g. migrated from
		// the old auth provider) — set it so the first admin isn't locked out.
		const passwordHash = await hashPassword(bootstrapPassword)
		await client.execute({
			sql: "UPDATE users SET password_hash = ?, modified_by = 'system', modified_date = ? WHERE id = ?",
			args: [passwordHash, now, existing.rows[0].id],
		})
		console.log(`Bootstrap admin password set: ${bootstrapEmail}`)
	}
}

console.log("Migrations applied and system user seeded")
client.close()
