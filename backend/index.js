const express = require('express');
require('dotenv').config({ path: '../.env' });
const path = require('path');
const cors = require('cors');
const pool = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth.routes');
const txRoutes = require('./routes/tx.routes');
const scannerRoutes = require('./routes/scanner.routes');
const settingsRoutes = require('./routes/settings.routes');
const chatRoutes = require('./routes/chat.routes');
const bankRoutes = require('./routes/banks.routes');

app.use('/api/auth', authRoutes);
app.use('/api/expenses', txRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/user-settings', settingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/banks', bankRoutes);

// Test Endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW();');
    res.json({ status: 'Connected to PostgreSQL!', timestamp: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database connection error');
  }
});

app.get('/', (req, res) => {
  res.send("SpendSight backend engine is breathing smoothly!");
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});