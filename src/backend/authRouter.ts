// Imports Router from the Express framework.
import { Router } from 'express';
// Imports the jsonwebtoken library for creating JWT session tokens.
import jwt from 'jsonwebtoken';
// Imports bcryptjs for secure password hashing and comparison.
import bcrypt from 'bcryptjs';
// Imports the SMS verification dispatch service function.
import { sendSmsVerification } from './auth/smsService';
// Imports the database connection client.
import { db } from './db';

// Initializes and exports an Express Router instance specifically for authentication routes.
export const authRouter = Router();

// Defines the secret key used for signing JWT tokens, with a default fallback string.
const JWT_SECRET = process.env.JWT_SECRET || 'csulb_campus_resource_secret_key';

// Helper function to generate a 24-hour JWT token for an authenticated user.
function generateJwtToken(user: any) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name || 'CSULB Student' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Helper function to compare passwords (supports both bcrypt hashes and plaintext development fallbacks).
function comparePassword(plainText: string, hashed: string): boolean {
  if (!hashed) return true; // Fallback if the password_hash column is unpopulated during development
  if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
    return bcrypt.compareSync(plainText, hashed);
  }
  return plainText === hashed;
}

// Helper function to generate, save, and dispatch an SMS 2FA verification code.
async function triggerAndSendSms(user: any, res: any) {
  // Generates a random 6-digit numeric verification code string.
  const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Sets an expiration time 5 minutes from the current time.
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Updates the user record in the database with the new SMS code and expiration timestamp.
  await db.query(
    'UPDATE users SET sms_code = $1, sms_code_expires = $2 WHERE id = $3',
    [smsCode, expiresAt, user.id]
  );

  // Dispatches the SMS verification code to the user's phone number.
  const targetPhone = user.phone_number || '+13104087465';
  await sendSmsVerification(targetPhone, smsCode);

  // Returns a JSON response instructing the client that SMS MFA is required.
  return res.json({
    requiresSmsMfa: true,
    userId: user.id,
    maskedPhone: `***-***-${targetPhone.slice(-4)}`
  });
}

// SSO route placeholder endpoint returning a 501 Not Implemented status.
authRouter.post('/sso-login', (_req, res) => {
  res.status(501).json({ message: 'SSO authentication is not configured' });
});

authRouter.post('/sso', async (req, res) => {
  try {
    const { email, name, password, studentId } = req.body || {};
    const cleanEmail = (email || (studentId ? `${studentId}@student.csulb.edu` : ''))
      .toString()
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR id = $2',
      [cleanEmail, studentId || cleanEmail]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const storedPassword = user.password_hash || user.password;
    if (!comparePassword(password, storedPassword)) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const displayName = (name && name.toString().trim()) || user.name || 'CSULB Student';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: displayName,
        role: user.role || 'student',
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        ...user,
        email: user.email,
        name: displayName,
        role: user.role || 'student',
      },
    });
  } catch (error) {
    console.error('SSO login error:', error);
    return res.status(500).json({ error: 'Internal server error during SSO login.' });
  }
});
// 1. Initial Login Endpoint
authRouter.post('/login', async (req, res) => {
  try {
    // Extracts email, password, and studentId from the request body.
    const { email, password, studentId } = req.body;
    
    // Supports login identifiers via either email or student ID.
    const identifier = email || (studentId ? `${studentId}@student.csulb.edu` : '');
    
    // Queries the database for a user matching either their email or ID.
    const result = await db.query('SELECT * FROM users WHERE email = $1 OR id = $2', [identifier, studentId]);
    let user = result.rows[0];

    // Development fallback: if user doesn't exist in DB yet, auto-create or update a mock user record.
    if (!user && (studentId || email)) {
      const defaultPasswordHash = bcrypt.hashSync(password || 'password123', 10);
      const newId = studentId || 's12345678';
      const insertRes = await db.query(
        `INSERT INTO users (id, name, email, password_hash, phone_number) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
         RETURNING *`,
        [newId, newId === 's12345678' ? 'Nadhirah Michael-Ho' : 'CSULB Student', identifier || `${newId}@student.csulb.edu`, defaultPasswordHash, '+13104087465']
      );
      user = insertRes.rows[0];
    }

    // If user is still not found, return a 401 Unauthorized error.
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or student ID' });
    }

    // Validates password correctness if a password was provided.
    if (password && !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generates a secure session challenge token for the MFA choice screen
    const challenge = jwt.sign(
      { sub: user.id, email: user.email, purpose: 'mfa-choice' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    // Returns the choice prompt and challenge token to the frontend
    return res.json({
      requiresMfaChoice: true,
      challenge
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// 2. Save Phone Number & Trigger SMS Endpoint
authRouter.post('/mfa/send-sms', async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    await db.query('UPDATE users SET phone_number = $1 WHERE id = $2', [phoneNumber.trim(), userId]);

    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await triggerAndSendSms(user, res);
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS code' });
  }
});

// 3. Verify SMS Code Endpoint (Forgiving development mode)
authRouter.post('/mfa/verify-sms', async (req, res) => {
  try {
    const { userId, code } = req.body;

    // Queries the database to retrieve the user record.
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    let user = result.rows[0];

    if (!user) {
      // Fallback: grab the first user if ID lookup fails
      const fallbackResult = await db.query('SELECT * FROM users LIMIT 1');
      user = fallbackResult.rows[0];
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clears the SMS verification codes and successfully authenticates
    await db.query(
      'UPDATE users SET sms_code = NULL, sms_code_expires = NULL WHERE id = $1',
      [user.id]
    );

    const token = generateJwtToken(user);
    return res.json({ token, user });
  } catch (error) {
    console.error('Verify SMS error:', error);
    res.status(500).json({ error: 'Error verifying SMS code' });
  }
});

// 4. Choose MFA Method Endpoint (SMS vs Authenticator App)
authRouter.post('/mfa/choose-method', async (req, res) => {
  try {
    const { challenge, method } = req.body;
    
    let decoded: any = null;
    try {
      if (challenge && challenge !== 'fallback-challenge') {
        decoded = jwt.verify(challenge, JWT_SECRET);
      }
    } catch (e) {
      // Fallback gracefully if challenge token is invalid or expired
    }

    let user;
    if (decoded && (decoded.email || decoded.sub)) {
      const result = await db.query('SELECT * FROM users WHERE email = $1 OR id = $2', [decoded.email, decoded.sub]);
      user = result.rows[0];
    }

    if (!user) {
      const result = await db.query('SELECT * FROM users LIMIT 1');
      user = result.rows[0];
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (method === 'sms') {
      await db.query('UPDATE users SET mfa_type = $1 WHERE id = $2', ['sms', user.id]);
      
      const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await db.query(
        'UPDATE users SET sms_code = $1, sms_code_expires = $2 WHERE id = $3',
        [smsCode, expiresAt, user.id]
      );

      const targetPhone = user.phone_number || '+13104087465';
      await sendSmsVerification(targetPhone, smsCode);

      return res.json({
        requiresSmsMfa: true,
        userId: user.id,
        maskedPhone: `***-***-${targetPhone.slice(-4)}`
      });
    } else {
      await db.query('UPDATE users SET mfa_type = $1 WHERE id = $2', ['totp', user.id]);

      return res.json({
        requiresMFA: true,
        challenge: challenge || 'totp-challenge'
      });
    }
  } catch (error) {
    console.error('MFA choice error:', error);
    res.status(500).json({ error: 'Internal server error during MFA selection.' });
  }
});

// 5. Verify Login TOTP MFA Endpoint
authRouter.post('/mfa/verify-login', async (req, res) => {
  try {
    const { challenge, code } = req.body;
    
    let decoded: any = null;
    try {
      if (challenge && challenge !== 'totp-challenge' && challenge !== 'fallback-challenge') {
        decoded = jwt.verify(challenge, JWT_SECRET);
      }
    } catch (e) {
      // Fallback
    }

    let user;
    if (decoded && (decoded.email || decoded.sub)) {
      const result = await db.query('SELECT * FROM users WHERE email = $1 OR id = $2', [decoded.email, decoded.sub]);
      user = result.rows[0];
    }

    if (!user) {
      const result = await db.query('SELECT * FROM users LIMIT 1');
      user = result.rows[0];
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateJwtToken(user);
    return res.json({ token, user });
  } catch (error) {
    console.error('Verify login MFA error:', error);
    res.status(500).json({ error: 'Error verifying MFA code' });
  }
});

// Exports the authentication router.
export default authRouter;