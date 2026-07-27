const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const sendResetEmail = async (email, token, origin) => {
  const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${baseUrl}/?action=reset-password&token=${token}&email=${encodeURIComponent(email)}`;
  
  console.log('========================================');
  console.log(`PASSWORD RESET LINK FOR ${email}:`);
  console.log(resetUrl);
  console.log('========================================');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP credentials missing. Reset link printed to console.');
    return { loggedToConsole: true };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"SpendSight Support" <support@spendsight.com>',
    to: email,
    subject: 'SpendSight - Password Reset Request',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>SpendSight Password Reset</h2>
        <p>You requested a password reset for your SpendSight account. Please click the button below to set a new password:</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #00d8f6; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">This link will expire in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // Use STARTTLS on port 587 (not SSL on 465)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certs in some environments
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId, 'to:', email);
  } catch (emailError) {
    console.error('Failed to send email via SMTP:', emailError.message);
    throw emailError; // Re-throw so the caller knows it failed
  }
};

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

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'No user registered with this email address' });
    }

    const user = userCheck.rows[0];
    if (user.reset_token_expires) {
      const remainingTime = new Date(user.reset_token_expires).getTime() - Date.now();
      // If remaining time is more than 4 minutes but less than/equal to 5 minutes, it was requested < 1 minute ago.
      // If it is more than 5 minutes, it is a legacy token, so we bypass the rate limit.
      if (remainingTime > 240000 && remainingTime <= 300000) {
        const waitSec = Math.ceil((remainingTime - 240000) / 1000);
        return res.status(429).json({ error: `Please wait ${waitSec} seconds before requesting another reset link.` });
      }
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 300000); // 5 minutes from now

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [token, expires, email]
    );

    await sendResetEmail(email, token, req.headers.origin);

    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Error during forgot password:', error);
    res.status(500).json({ error: 'Internal server error during forgot password' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token, and new password are required' });
  }

  try {
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [email, token]
    );

    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error during password reset:', error);
    res.status(500).json({ error: 'Internal server error during password reset' });
  }
};
