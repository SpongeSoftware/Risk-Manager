import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/**
 * Password hashing and token utilities built on `node:crypto` — no native
 * dependencies. Passwords are hashed with scrypt (memory-hard key stretching)
 * using a per-user random salt. Session and invite tokens are random values
 * whose SHA-256 digests are what get persisted.
 */

/** scrypt CPU/memory cost. 16384 × 8 × 128 = 16 MiB, within Node's default maxmem. */
const SCRYPT_N = 16384
/** scrypt block size. */
const SCRYPT_R = 8
/** scrypt parallelisation. */
const SCRYPT_P = 1
/** Derived key length in bytes. */
const KEY_LENGTH = 64
/** Salt length in bytes. */
const SALT_LENGTH = 16

function deriveKey(password: string, salt: Buffer, n: number, r: number, p: number) {
	return new Promise<Buffer>((resolve, reject) => {
		scrypt(password, salt, KEY_LENGTH, { N: n, r, p }, (err, key) => {
			if (err) reject(err)
			else resolve(key)
		})
	})
}

/**
 * Hashes a password with scrypt and a fresh random salt.
 *
 * @param password - The plaintext password.
 * @returns A self-describing hash string: `scrypt$N$r$p$<salt-b64url>$<hash-b64url>`.
 *   Storing the parameters alongside the hash lets them be raised later without
 *   invalidating existing credentials.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LENGTH)
	const key = await deriveKey(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
	return [
		"scrypt",
		SCRYPT_N,
		SCRYPT_R,
		SCRYPT_P,
		salt.toString("base64url"),
		key.toString("base64url"),
	].join("$")
}

/**
 * Verifies a password against a stored `scrypt$N$r$p$salt$hash` string using a
 * constant-time comparison.
 *
 * @param password - The plaintext password to check.
 * @param stored - The stored hash string from {@link hashPassword}.
 * @returns `true` on match; `false` on mismatch or malformed input (never throws).
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	try {
		const [algorithm, nStr, rStr, pStr, saltB64, hashB64] = stored.split("$")
		if (algorithm !== "scrypt") return false
		const [n, r, p] = [Number(nStr), Number(rStr), Number(pStr)]
		if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false
		const salt = Buffer.from(saltB64, "base64url")
		const expected = Buffer.from(hashB64, "base64url")
		if (expected.length !== KEY_LENGTH) return false
		const actual = await deriveKey(password, salt, n, r, p)
		return timingSafeEqual(actual, expected)
	} catch {
		return false
	}
}

/**
 * Burns one scrypt derivation without revealing anything. Called on login when
 * the email doesn't resolve to a user with a password, so both code paths cost
 * the same and response timing can't be used to enumerate accounts.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
	await deriveKey(password, randomBytes(SALT_LENGTH), SCRYPT_N, SCRYPT_R, SCRYPT_P)
}

/**
 * Generates a cryptographically random opaque token for sessions and invites.
 *
 * @returns 32 random bytes as a base64url string (~43 chars).
 */
export function generateToken(): string {
	return randomBytes(32).toString("base64url")
}

/**
 * Hashes a raw token for storage or lookup. Tokens are high-entropy random
 * values, so a single unsalted SHA-256 is sufficient — the DB never sees the
 * raw token, and a leaked digest cannot be inverted or reused.
 *
 * @param raw - The raw token as handed to the client.
 * @returns The base64url-encoded SHA-256 digest.
 */
export function hashToken(raw: string): string {
	return createHash("sha256").update(raw).digest("base64url")
}
