const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON request bodies

// 🖥️ Initialize the PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // 🛠️ Set this to false to resolve the SSL handshake error
});

// 📥 1. POST ROUTE: Save a new expense to the database
app.post('/api/expenses', async (req, res) => {
  try {
    const { amount, category, description } = req.body;
    
    const queryText = `
      INSERT INTO expenses (amount, category, description) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `;
    
    const values = [amount, category, description];
    const result = await pool.query(queryText, values);
    
    res.status(201).json(result.rows[0]); // Returns the saved row back to the client
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while saving expense.');
  }
});

// 📤 2. GET ROUTE: Fetch all logged expenses from the database
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC;');
    res.json(result.rows); // Returns the array of expenses as JSON
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while fetching expenses.');
  }
});

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

// google login
const { OAuth2Client } = require('google-auth-library');
// Initialize the Google Client (We will put your actual Client ID in the .env later!)
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🚀 GOOGLE AUTHENTICATION ENDPOINT (Updated for Frontend Access Tokens)
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Google token is required' });
  }

  try {
    // 1. Fetch user profile data directly from Google using the incoming Access Token
    const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    const payload = await googleResponse.json();

    if (!googleResponse.ok) {
      return res.status(401).json({ error: 'Google authentication failed' });
    }
    
    // Extract verified user profile information from Google's response payload
    const { sub: googleId, email, name, picture } = payload;

    // 2. Query your PostgreSQL database to see if this user already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    let user;

    if (userCheck.rows.length > 0) {
      // 🟢 SCENARIO A: User exists! Log them in.
      user = userCheck.rows[0];
      
      // If they logged in via email previously but are now connecting Google, link it!
      if (!user.google_id) {
        const updateResult = await pool.query(
          'UPDATE users SET google_id = $1, picture = $2 WHERE email = $3 RETURNING *',
          [googleId, picture, email]
        );
        user = updateResult.rows[0];
      }
    } else {
      // 🔵 SCENARIO B: Brand new user! Create their row seamlessly (Invisible Signup)
      const newUserResult = await pool.query(
        'INSERT INTO users (email, google_id, name, picture) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, googleId, name, picture]
      );
      user = newUserResult.rows[0];
    }

    // 3. Authentication successful! Send user data back to the React UI
    res.status(200).json({
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        hasPassword: user.password_hash ? true : false // Tells frontend if they've set a password yet!
      }
    });

  } catch (error) {
    console.error('Error during Google authentication endpoint execution:', error);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
});

// password
app.post('/api/auth/password', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userCheck.rows[0];

        if (!user.password_hash) {
            return res.status(403).json({ error: 'User has no password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.status(200).json({
            message: 'Password authentication successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
                hasPassword: true
            }
        });

    } catch (error) {
        console.error('Error during password authentication:', error);
        res.status(500).json({ error: 'Internal server password authentication error' });
    }
});

// Update / Create password endpoint
app.post('/api/auth/password/update', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  try {
    // 1. Fetch user from DB
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userCheck.rows[0];

    // 2. If user already has a password, verify current password
    if (user.password_hash) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Old password is required to change password' });
      }
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Incorrect old password' });
      }
      if (oldPassword === newPassword) {
        return res.status(400).json({ error: 'New password cannot be the same as the old password' });
      }
    }

    // 3. Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. Update password_hash in DB
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error during password update:', error);
    res.status(500).json({ error: 'Internal server error during password update' });
  }
});

// Fetch user status endpoint
app.get('/api/auth/status', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userCheck.rows[0];
    res.status(200).json({
      hasPassword: user.password_hash ? true : false,
      name: user.name,
      picture: user.picture
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});