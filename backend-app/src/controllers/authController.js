import { query } from '../config/database.js';
import { hashPassword, verifyPassword } from '../utils/passwordHelper.js';
import { signJWT } from '../utils/jwtHelper.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Handle new user registration.
 *
 * Security: Requires a shared organization code (REGISTRATION_CODE env var)
 * to prevent arbitrary public sign-ups while allowing self-service registration
 * for authorized farm personnel without manual admin intervention.
 *
 * New users are automatically assigned the 'operator' role and can login immediately.
 */
export async function register(req, res) {
  try {
    const { username, password, nama_lengkap, organization_code } = req.body;

    // --- Validate required fields ---
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username dan password wajib diisi',
      });
    }

    // --- Validate organization code ---
    if (!organization_code || organization_code !== env.REGISTRATION_CODE) {
      logger.warn(`[AUTH] Registration rejected — invalid organization code for username: ${username}`);
      return res.status(403).json({
        success: false,
        error: 'Kode organisasi tidak valid. Hubungi administrator Lokatani untuk mendapatkan kode.',
      });
    }

    // --- Validate username format (alphanumeric + underscore, 3-30 chars) ---
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username harus 3-30 karakter (huruf, angka, atau underscore)',
      });
    }

    // --- Validate password length ---
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password minimal 6 karakter',
      });
    }

    // --- Check username uniqueness ---
    const existing = await query('SELECT id FROM tb_users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Username sudah terdaftar. Silakan gunakan username lain.',
      });
    }

    // --- Hash password & insert user ---
    const hashedPassword = hashPassword(password);
    const insertSql = `
      INSERT INTO tb_users (username, password, nama_lengkap, role)
      VALUES ($1, $2, $3, 'operator')
      RETURNING id, username, nama_lengkap, role, created_at
    `;
    const { rows } = await query(insertSql, [
      username,
      hashedPassword,
      nama_lengkap || null,
    ]);

    const newUser = rows[0];
    logger.info(`[AUTH] ✅ New user registered: ${newUser.username} (role: ${newUser.role})`);

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        nama_lengkap: newUser.nama_lengkap,
        role: newUser.role,
      },
    });
  } catch (error) {
    logger.error('[AUTH] Registration error:', error.message);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan server' });
  }
}

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
