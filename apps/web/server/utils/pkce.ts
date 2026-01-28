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
 * Create state parameter with environment info
 */
export function createState(env: 'dev' | 'prod', nonce: string): string {
  return Buffer.from(JSON.stringify({ env, nonce })).toString('base64url')
}

/**
 * Parse state parameter
 */
export function parseState(state: string): { env: 'dev' | 'prod'; nonce: string } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}
