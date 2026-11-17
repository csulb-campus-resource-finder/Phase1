// Imports Router from the Express framework.
import { Router } from 'express';
// Imports jsonwebtoken for verifying session challenges and signing updated tokens.
import jwt from 'jsonwebtoken';
// Imports speakeasy for generating and verifying TOTP codes.
import speakeasy from 'speakeasy';
// Imports qrcode for rendering setup QR codes.
import qrcode from 'qrcode';
// Imports the database connection client.
import { db } from '../backend/db';
// Imports the SMS verification dispatch service function.
import { sendSmsVerification } from '../backend/auth/smsService';

// Initializes and exports an Express Router instance for MFA routes.
export const mfaRouter = Router();

// 1. Endpoint for receiving the user's choice (SMS vs Authenticator App)
mfaRouter.post('/choose-method', async (req, res) => {
  try {
    const { method } = req.body;
    
    const result = await db.query('SELECT * FROM users LIMIT 1');
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found in database.' });
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
        challenge: 'totp-challenge'
      });
    }
  } catch (error) {
    console.error('MFA choice error:', error);
    res.status(500).json({ error: 'Internal server error during MFA selection.' });
  }
});

// 2. Endpoint to generate the TOTP Secret and QR Code for Authenticator App setup
mfaRouter.post('/setup', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let userEmail = 'nadhirah.michael-ho01@student.csulb.edu';
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'csulb-dev-secret-key-2026');
        if (decoded && decoded.email) userEmail = decoded.email;
        else if (decoded && decoded.id) userEmail = decoded.id;
      } catch (e) {}
    }

    const userResult = await db.query('SELECT * FROM users WHERE id = $1 OR email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userResult.rows[0];

    const secret = speakeasy.generateSecret({
      name: `CSULB Campus Resource Finder (${user.email})`
    });

    await db.query(
      'UPDATE users SET pending_secret = $1 WHERE id = $2 OR email = $2',
      [secret.base32, user.id]
    );

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    return res.json({
      qrCode: qrCodeUrl,
      secret: secret.base32
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return res.status(500).json({ error: 'Failed to generate MFA setup QR code.' });
  }
});

// 3. Endpoint to verify the initial setup code and enable MFA
mfaRouter.post('/verify-setup', async (req, res) => {
  try {
    const { code } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    let userEmail = 'nadhirah.michael-ho01@student.csulb.edu';
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'csulb-dev-secret-key-2026');
        if (decoded && decoded.email) userEmail = decoded.email;
        else if (decoded && decoded.id) userEmail = decoded.id;
      } catch (e) {}
    }

    const userResult = await db.query('SELECT * FROM users WHERE id = $1 OR email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userResult.rows[0];

    if (!user.pending_secret) {
      return res.status(400).json({ error: 'No pending MFA setup found. Please generate QR code first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.pending_secret,
      encoding: 'base32',
      token: String(code || '').trim(),
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
    }

    await db.query(
      'UPDATE users SET mfa_secret = pending_secret, pending_secret = NULL, mfa_enabled = TRUE WHERE id = $1 OR email = $1',
      [user.id]
    );

    const newToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'csulb-dev-secret-key-2026',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'MFA enabled successfully.',
      token: newToken
    });
  } catch (error) {
    console.error('MFA verify setup error:', error);
    return res.status(500).json({ error: 'Failed to verify MFA setup.' });
  }
});

// 4. Endpoint to verify TOTP code during login (STRICT REJECTION)
mfaRouter.post('/verify-login', async (req, res) => {
  try {
    const { code, email } = req.body;
    console.log(`🔒 [MFA Login Verify] Received code: "${code}" for email: "${email || 'LIMIT 1 fallback'}"`);

    let userQuery = 'SELECT * FROM users LIMIT 1';
    let queryParams: any[] = [];
    if (email) {
      userQuery = 'SELECT * FROM users WHERE email = $1 OR id = $1';
      queryParams = [email];
    }

    const userResult = await db.query(userQuery, queryParams);
    if (userResult.rows.length === 0) {
      console.log('❌ [MFA Login Verify] User not found in database.');
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userResult.rows[0];

    if (!user.mfa_secret) {
      console.log('❌ [MFA Login Verify] User has no mfa_secret configured.');
      return res.status(400).json({ error: 'Authenticator app is not enabled for this account.' });
    }

    const cleanCode = String(code || '').trim();
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: cleanCode,
      window: 1
    });

    console.log(`🔍 [MFA Login Verify] Speakeasy verification result: ${verified}`);

    if (!verified) {
      console.log('❌ [MFA Login Verify] Code REJECTED.');
      return res.status(400).json({ error: 'Invalid authenticator code. Please try again.' });
    }

    console.log('✅ [MFA Login Verify] Code ACCEPTED. Issuing token.');
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'csulb-dev-secret-key-2026',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        email: user.email,
        name: user.name || 'Nadhirah Michael-Ho'
      }
    });
  } catch (error) {
    console.error('MFA verify login error:', error);
    return res.status(500).json({ error: 'Internal server error during MFA login verification.' });
  }
});

export default mfaRouter;