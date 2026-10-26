// Imports Router from the Express framework.
import { Router } from 'express';
// Imports jsonwebtoken for verifying session challenges.
import jwt from 'jsonwebtoken';
// Imports the database connection client.
import { db } from '../backend/db';
// Imports the SMS verification dispatch service function.
import { sendSmsVerification } from '../backend/auth/smsService';



// Initializes and exports an Express Router instance for MFA routes.
export const mfaRouter = Router();

// Endpoint for receiving the user's choice (SMS vs Authenticator App)
mfaRouter.post('/choose-method', async (req, res) => {
  try {
    const { method } = req.body;
    
    // Automatically fetch the primary test user from the database
    const result = await db.query('SELECT * FROM users LIMIT 1');
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found in database.' });
    }

    if (method === 'sms') {
      // Update MFA preference, generate 6-digit code, and trigger Twilio SMS
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
      // Authenticator App (TOTP) selection
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

export default mfaRouter;