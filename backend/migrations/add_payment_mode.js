require('dotenv').config({ path: '.env' });
const pool = require('../config/db');

async function migrate() {
  try {
    // Add linked_account_id to expenses table
    await pool.query(`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES linked_accounts(id) ON DELETE SET NULL;
    `);
    console.log('Added linked_account_id to expenses table.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
