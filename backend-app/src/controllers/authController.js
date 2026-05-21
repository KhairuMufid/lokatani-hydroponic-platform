import { query } from '../config/database.js';
import { verifyPassword } from '../utils/passwordHelper.js';
import { signJWT } from '../utils/jwtHelper.js';
import logger from '../utils/logger.js';

/**
 * Handle human login to generate JWT.
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    // Lookup user
    const { rows } = await query('SELECT id, username, password, role FROM tb_users WHERE username = $1', [username]);
    
    if (rows.length === 0) {
      logger.warn(`[AUTH] Failed login attempt for username: ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = rows[0];

    // Verify native scrypt hash
    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      logger.warn(`[AUTH] Failed login attempt for username: ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate token
    const token = signJWT({ id: user.id, username: user.username, role: user.role });

    logger.info(`[AUTH] Successful login for username: ${username}`);
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role }
      }
    });
  } catch (error) {
    logger.error('[AUTH] Login error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Get current user profile (verifies token is still valid).
 */
export async function me(req, res) {
  try {
    const { rows } = await query('SELECT id, username, role, created_at FROM tb_users WHERE id = $1', [req.user.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('[AUTH] Profile fetch error:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
