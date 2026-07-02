/**
 * In-memory sliding-window rate limiter for login attempts. State lives in a
 * module-level Map, so limits reset on server restart and apply per instance —
 * an acceptable trade-off for this single-instance deployment.
 */

/** Window length: 15 minutes. */
const WINDOW_MS = 15 * 60 * 1000
/** Maximum failed attempts per key within the window. */
const MAX_FAILURES = 10

const failures = new Map<string, number[]>()

function prune(key: string): number[] {
	const cutoff = Date.now() - WINDOW_MS
	const recent = (failures.get(key) ?? []).filter((t) => t > cutoff)
	if (recent.length === 0) failures.delete(key)
	else failures.set(key, recent)
	return recent
}

/**
 * Checks whether a key (email or IP) is still allowed to attempt a login.
 *
 * @param key - The rate-limit bucket, e.g. `email:foo@bar.com` or `ip:1.2.3.4`.
 * @returns `true` if the attempt may proceed; `false` if throttled.
 */
export function checkRateLimit(key: string): boolean {
	return prune(key).length < MAX_FAILURES
}

/**
 * Records a failed login attempt against a key.
 *
 * @param key - The rate-limit bucket.
 */
export function recordFailure(key: string) {
	const recent = prune(key)
	recent.push(Date.now())
	failures.set(key, recent)
}

/**
 * Clears all recorded failures for a key after a successful login.
 *
 * @param key - The rate-limit bucket.
 */
export function clearFailures(key: string) {
	failures.delete(key)
}
