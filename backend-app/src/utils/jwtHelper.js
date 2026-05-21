import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Base64Url encoder (RFC 4648)
 */
function base64url(input) {
  const buffer = typeof input === 'string' ? Buffer.from(input) : input;
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generate a standard HS256 JWT without external dependencies.
 * @param {Object} payload - Data to embed in the token.
 * @returns {string} Signed JWT.
 */
export function signJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + env.JWT_EXPIRES_IN_SEC;
  
  const tokenPayload = { ...payload, iat: now, exp };
  const encodedPayload = base64url(JSON.stringify(tokenPayload));
  
  const signature = crypto.createHmac('sha256', env.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
    
  return `${encodedHeader}.${encodedPayload}.${base64url(signature)}`;
}

/**
 * Verify and decode an HS256 JWT.
 * @param {string} token - The JWT string.
 * @returns {Object|null} The decoded payload if valid, or null if invalid/expired.
 */
export function verifyJWT(token) {
  if (!token || typeof token !== 'string') return null;
  
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [encodedHeader, encodedPayload, signature] = parts;
  
  try {
    const expectedSignature = crypto.createHmac('sha256', env.JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
      
    // Reconstruct base64url of the expected signature to compare securely
    const expectedSignatureStr = base64url(expectedSignature);
    
    // Prevent timing attacks using length-safe buffering
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignatureStr);
    
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    
    const payloadStr = Buffer.from(encodedPayload, 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Token expired
    }
    
    return payload;
  } catch (err) {
    return null;
  }
}
