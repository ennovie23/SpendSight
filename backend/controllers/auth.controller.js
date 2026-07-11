const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth handler
exports.googleLogin = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Google token is required' });
  }

  try {
    const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    const payload = await googleResponse.json();

    if (!googleResponse.ok) {
      return res.status(401).json({ error: 'Google authentication failed' });
    }
    
    const { sub: googleId, email, name, picture } = payload;

    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    let user;

    if (userCheck.rows.length > 0) {
      user = userCheck.rows[0];
      
      if (!user.google_id) {
        const updateResult = await pool.query(
          'UPDATE users SET google_id = $1, picture = $2 WHERE email = $3 RETURNING *',
          [googleId, picture, email]
        );
        user = updateResult.rows[0];
      }
    } else {
      const newUserResult = await pool.query(
        'INSERT INTO users (email, google_id, name, picture) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, googleId, name, picture]
      );
      user = newUserResult.rows[0];
    }

    res.status(200).json({
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        hasPassword: user.password_hash ? true : false,
        user_id: user.id
      }
    });

  } catch (error) {
    console.error('Error during Google authentication controller execution:', error);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
};

// Standard Password login handler
exports.passwordLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Please sign up with Google first.' });
    }

    const user = userCheck.rows[0];

    if (!user.password_hash) {
      return res.status(403).json({ error: 'User has no password. Please log in with Google instead.' });
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
        hasPassword: true,
        user_id: user.id
      }
    });

  } catch (error) {
    console.error('Error during password authentication:', error);
    res.status(500).json({ error: 'Internal server password authentication error' });
  }
};

// Update or set password handler
exports.updatePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userCheck.rows[0];

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

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error during password update:', error);
    res.status(500).json({ error: 'Internal server error during password update' });
  }
};

// Fetch user status handler
exports.getStatus = async (req, res) => {
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
};
