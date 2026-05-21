import pg from 'pg';
import env from '../config/env.js';
import { hashPassword } from '../utils/passwordHelper.js';

const { Pool } = pg;

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

async function seedUsers() {
  try {
    const adminHash = hashPassword('admin123');
    const operatorHash = hashPassword('operator123');

    await pool.query(`
      INSERT INTO tb_users (username, password, role) VALUES 
      ('admin', $1, 'admin'),
      ('operator', $2, 'operator')
      ON CONFLICT (username) DO NOTHING;
    `, [adminHash, operatorHash]);

    console.log('✅ Default users seeded successfully:');
    console.log('   - username: admin | password: admin123');
    console.log('   - username: operator | password: operator123');
  } catch (error) {
    console.error('❌ Failed to seed users:', error);
  } finally {
    pool.end();
  }
}

seedUsers();
