import crypto from 'crypto'

/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.1
 */

/**
 * Generate cryptographically random string for code_verifier
 * Must be 43-128 characters, using unreserved characters
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Create code_challenge from code_verifier using SHA-256
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

/**
 * Generate random state for CSRF protection
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64url')
}

/**
 * Create signed state parameter with environment info
 * Uses HMAC-SHA256 to prevent tampering
 */
export function createState(env: 'dev' | 'prod', nonce: string, secret: string): string {
  const payload = JSON.stringify({ env, nonce, ts: Date.now() })
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url')
  return `${payloadB64}.${signature}`
}

/**
 * Parse and verify signed state parameter
 * Returns null if signature is invalid or state is too old (10 min)
 */
export function parseState(state: string, secret: string): { env: 'dev' | 'prod'; nonce: string } | null {
  try {
    const [payloadB64, signature] = state.split('.')
    if (!payloadB64 || !signature) return null

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url')
    if (signature !== expectedSig) return null

    // Parse payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'))

    // Check timestamp (10 minute expiry)
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null

    return { env: payload.env, nonce: payload.nonce }
  } catch {
    return null
  }
}
