import crypto from 'crypto';

/**
 * Securely hash a password using Node.js native scrypt.
 * Scrypt is memory-hard and highly resistant to brute-force attacks.
 * Requires ZERO external dependencies (no bcrypt/argon2 needed).
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verify a plain text password against a stored scrypt hash.
 */
export function verifyPassword(password, hash) {
  try {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(derivedKey));
  } catch (err) {
    return false;
  }
}
