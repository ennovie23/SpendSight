const pool = require('../config/db');

async function migrate() {
  try {
    console.log('Altering reset_token_expires column type to TIMESTAMPTZ...');
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN reset_token_expires TYPE TIMESTAMPTZ;
    `);
    console.log('Migration successful: reset_token_expires is now TIMESTAMPTZ!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
