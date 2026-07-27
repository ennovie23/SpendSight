const pool = require('../config/db');

async function migrate() {
  try {
    console.log('Running reset token columns migration...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
    `);
    console.log('Migration successful: reset token columns added!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
