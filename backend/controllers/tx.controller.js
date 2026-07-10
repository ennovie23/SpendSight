const pool = require('../config/db');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const deleteImageFile = async (receipt_url) => {
  if (!receipt_url) return;
  try {
    if (receipt_url.includes('cloudinary.com')) {
      const parts = receipt_url.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      const publicId = `${folder}/${filenameWithExt.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
    } else if (receipt_url.startsWith('/uploads/')) {
      const filename = receipt_url.replace('/uploads/', '');
      const filepath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
  } catch (err) {
    console.error('Failed to delete image file:', err);
  }
};

const streamifier = require('streamifier');

// Save a new expense to the database
exports.addExpense = async (req, res) => {
  try {
    const { amount, category, description, date, user_id, receipt_url, merchant, linked_account_id } = req.body;
    
    let finalReceiptUrl = receipt_url || '';
    
    // If a file was uploaded, save it to Cloudinary
    if (req.file) {
      finalReceiptUrl = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'spendsight_uploads' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
    }

    await pool.query('BEGIN');

    // 1. Validate Balance if linked_account_id is provided
    if (linked_account_id) {
      const accountRes = await pool.query('SELECT balance FROM linked_accounts WHERE id = $1', [linked_account_id]);
      if (accountRes.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ error: 'Selected payment method not found.' });
      }

      const currentBalance = parseFloat(accountRes.rows[0].balance);
      const expenseAmount = parseFloat(amount);

      if (currentBalance < expenseAmount) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance in the selected account.' });
      }

      // 2. Deduct from balance
      await pool.query(
        'UPDATE linked_accounts SET balance = balance - $1 WHERE id = $2',
        [expenseAmount, linked_account_id]
      );
    }
    
    // 3. Insert the new expense
    const queryText = `
      INSERT INTO expenses (amount, category, description, date, user_id, receipt_url, merchant, linked_account_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *;
    `;
    
    const values = [amount, category, description, date, user_id, finalReceiptUrl, merchant, linked_account_id || null];
    const result = await pool.query(queryText, values);
    
    await pool.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error while saving expense.' });
  }
};

// Fetch active logged expenses from the database (deleted_at IS NULL)
exports.getExpenses = async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await pool.query(
      `SELECT e.*, l.bank_name, l.account_type 
       FROM expenses e 
       LEFT JOIN linked_accounts l ON e.linked_account_id = l.id 
       WHERE e.user_id = $1 AND e.deleted_at IS NULL 
       ORDER BY e.date DESC, e.id DESC;`,
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
      'SELECT * FROM expenses WHERE user_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC, id DESC;',
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
    
    // Fetch to see if there's an image
    const result = await pool.query('SELECT receipt_url FROM expenses WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      await deleteImageFile(result.rows[0].receipt_url);
    }

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
    
    // Fetch all trashed expenses to delete their images
    const result = await pool.query('SELECT receipt_url FROM expenses WHERE user_id = $1 AND deleted_at IS NOT NULL', [user_id]);
    for (const row of result.rows) {
      await deleteImageFile(row.receipt_url);
    }

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
    const { amount, category, description, date, receipt_url, merchant } = req.body;
    
    const queryText = `
      UPDATE expenses 
      SET amount = $1, category = $2, description = $3, date = $4, receipt_url = $5, merchant = $6
      WHERE id = $7 
      RETURNING *;
    `;
    
    const result = await pool.query(queryText, [amount, category, description, date, receipt_url, merchant, id]);
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
    const queryText = 'SELECT * FROM expenses WHERE user_id = $1 AND deleted_at IS NULL ORDER BY date DESC, id DESC;';
    const { rows: transactions } = await pool.query(queryText, [user_id]);

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
