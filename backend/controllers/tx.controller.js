const pool = require('../config/db');
const { spawn } = require('child_process');
const path = require('path');

// Save a new expense to the database
exports.addExpense = async (req, res) => {
  try {
    const { amount, category, description, date, user_id } = req.body;
    
    const queryText = `
      INSERT INTO expenses (amount, category, description, date, user_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *;
    `;
    
    const values = [amount, category, description, date, user_id];
    const result = await pool.query(queryText, values);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while saving expense.');
  }
};

// Fetch active logged expenses from the database (deleted_at IS NULL)
exports.getExpenses = async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 AND deleted_at IS NULL ORDER BY date DESC;',
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while fetching expenses.');
  }
};

// Soft delete an expense (update deleted_at timestamp)
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE expenses SET deleted_at = NOW() WHERE id = $1', [id]);
    res.status(200).json({ message: 'Expense soft-deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while soft-deleting expense.');
  }
};

// Fetch all soft-deleted expenses (deleted_at IS NOT NULL)
exports.getTrashedExpenses = async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC;',
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while fetching trashed expenses.');
  }
};

// Restore a soft-deleted expense (set deleted_at to NULL)
exports.restoreExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE expenses SET deleted_at = NULL WHERE id = $1', [id]);
    res.status(200).json({ message: 'Expense restored successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while restoring expense.');
  }
};

// Hard delete / purge an expense permanently from DB
exports.purgeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.status(200).json({ message: 'Expense permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while purging expense.');
  }
};

// Clear all trashed expenses for a user permanently
exports.clearTrash = async (req, res) => {
  try {
    const { user_id } = req.query;
    await pool.query('DELETE FROM expenses WHERE user_id = $1 AND deleted_at IS NOT NULL', [user_id]);
    res.status(200).json({ message: 'Trash cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while clearing trash.');
  }
};

// Update an existing expense in the database
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, description, date } = req.body;
    
    const queryText = `
      UPDATE expenses 
      SET amount = $1, category = $2, description = $3, date = $4 
      WHERE id = $5 
      RETURNING *;
    `;
    
    const result = await pool.query(queryText, [amount, category, description, date, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while updating expense.');
  }
};

// Spawn Python3 process executing analytics.py passing user transaction rows
exports.getAnalytics = async (req, res) => {
  try {
    const { user_id, month, year } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Query active database transactions for this user
    const queryText = 'SELECT * FROM expenses WHERE user_id = $1 AND deleted_at IS NULL ORDER BY date DESC;';
    const dbResult = await pool.query(queryText, [user_id]);
    const transactions = dbResult.rows;

    // Filter transactions by year on the backend if a specific year was selected
    let filteredTransactions = transactions;
    if (year) {
      filteredTransactions = filteredTransactions.filter(tx => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return d.getFullYear().toString() === year;
      });
    }

    // Filter transactions by month on the backend if a specific month was selected (except 'All')
    if (month && month !== 'All') {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      filteredTransactions = filteredTransactions.filter(tx => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        return monthNames[d.getMonth()] === month;
      });
    }

    // Path to the Python script
    const scriptPath = path.join(__dirname, '../services/analytics.py');

    // Spawn python3 process
    const pyProcess = spawn('python3', [scriptPath]);

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}. Stderr: ${stderrData}`);
        return res.status(500).json({ error: 'Error calculating analytics in Python.' });
      }
      try {
        const result = JSON.parse(stdoutData.trim());
        res.json(result);
      } catch (err) {
        console.error('Failed to parse Python stdout as JSON:', err, stdoutData);
        res.status(500).json({ error: 'Failed to parse analytics results.' });
      }
    });

    // Write transaction rows to Python standard input
    pyProcess.stdin.write(JSON.stringify(filteredTransactions));
    pyProcess.stdin.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while retrieving analytics.');
  }
};
