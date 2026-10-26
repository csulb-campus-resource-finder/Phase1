// Imports Request and Response types from the Express framework.
import { Request, Response } from 'express';
// Imports JSON Web Token library for generating and verifying cryptographic tokens.
import jwt from 'jsonwebtoken';
// Imports Node.js built-in crypto module for generating secure random IDs (UUIDs).
import crypto from 'node:crypto';
// Imports the application's secure secret key used for signing JWTs.
import { JWT_SECRET } from '../config/security';
// Imports the MFA repository class for looking up user records from the database.
import { MFARepository } from './mfaRepository';
// Imports Twilio client helper for sending SMS codes.
import { sendSmsVerification } from '../backend/auth/smsService';

// Extends the standard Express Request interface to include an optional user profile payload.
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;                 // Unique user ID
    email: string;              // User email address
    name: string;               // User full name
    role: 'student' | 'faculty' | 'staff'; // User permission role
  };
}

// Defines a service class containing static methods for handling SSO logins and token authorization.
export class SSOService {
  // Static asynchronous method to handle incoming SSO callback requests.
  static async handleSSOCallback(req: Request, res: Response): Promise<void> {
    // Extracts email and name properties from the incoming request body payload.
    const { email, name } = req.body;

    // Validates that the email exists and strictly ends with the official CSULB student domain suffix.
    if (!email || !email.endsWith('@student.csulb.edu')) {
      // Returns a 401 Unauthorized response if the email domain is invalid or missing.
      res.status(401).json({ error: 'Valid CSULB student email required.' });
      return;
    }

    // Queries the database via MFARepository to check if the user already exists.
    let user = await MFARepository.getUser(email);
    
    // If the user does not exist in the database, provision a default student user record object.
    if (!user) {
      user = {
        id: email,
        email,
        name: name || 'Nadhirah Michael-Ho',
        role: 'student',
        mfaEnabled: false,
        mfaSecret: null,
        pendingSecret: null,
        phoneNumber: null,
        mfaType: 'totp'
      } as any;
    }

    // Safely type-cast user record to include optional fields to satisfy TypeScript
    const dbUser = user as {
      id: string;
      email: string;
      name: string;
      role: 'student' | 'faculty' | 'staff';
      mfaEnabled: boolean;
      mfaSecret?: string | null;
      pendingSecret?: string | null;
      phoneNumber?: string | null;
      mfaType?: string | null;
    };

    // Checks if the user has multi-factor authentication enabled on their account.
    if (dbUser.mfaEnabled) {
      // Generates a challenge allowing the user to choose between SMS or Authenticator App.
      const challenge = jwt.sign(
        {
          sub: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          purpose: 'mfa-choice'
        },
        JWT_SECRET,
        {
          expiresIn: '5m',
          jwtid: crypto.randomUUID()
        }
      );

      res.status(200).json({
        requiresMfaChoice: true,
        challenge,
        message: 'Please select your verification method.'
      });
      return;
    }

    // If MFA is not yet enabled, issue a standard session token flagged for setup completion.
    const token = jwt.sign(
      {
        sub: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        mfaComplete: false
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Returns a 200 OK response prompting the user to complete their MFA setup.
    res.status(200).json({
      requiresMFA: false,
      requiresMFASetup: true,
      token,
      user: { email: dbUser.email, name: dbUser.name }
    });
  }

  // Handles the user's choice between SMS and Authenticator App (TOTP)
  static async handleMfaChoice(req: Request, res: Response): Promise<void> {
    const { challenge, method } = req.body;
    try {
      const decoded = jwt.verify(challenge, JWT_SECRET) as any;
      const user = await MFARepository.getUser(decoded.email);

      if (method === 'sms') {
        const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
        const phoneNumber = (user as any)?.phoneNumber || '+13104087465';
        
        if (phoneNumber) {
          await sendSmsVerification(phoneNumber, smsCode);
        }

        const newChallenge = jwt.sign(
          {
            sub: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            purpose: 'sms-mfa-login',
            smsCode
          },
          JWT_SECRET,
          { expiresIn: '5m', jwtid: crypto.randomUUID() }
        );

        const maskedPhone = '••••' + phoneNumber.slice(-4);
        res.status(200).json({ requiresSmsMfa: true, challenge: newChallenge, maskedPhone });
      } else {
        const newChallenge = jwt.sign(
          {
            sub: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            purpose: 'mfa-login'
          },
          JWT_SECRET,
          { expiresIn: '5m', jwtid: crypto.randomUUID() }
        );

        res.status(200).json({ requiresMFA: true, challenge: newChallenge });
      }
    } catch (err) {
      res.status(403).json({ error: 'Invalid or expired session challenge.' });
    }
  }

  // Express middleware function to secure and authenticate API routes using bearer tokens.
  static authenticateToken(req: AuthenticatedRequest, res: Response, next: Function): void {
    // Extracts the Authorization header from incoming HTTP request headers.
    const authHeader = req.headers['authorization'];
    // Extracts the raw token string following the 'Bearer ' schema prefix.
    const token = authHeader && authHeader.split(' ')[1];

    // If no access token is present, return a 401 Unauthorized error immediately.
    if (!token) {
      res.status(401).json({ error: 'Access token missing' });
      return;
    }

    try {
      // Verifies and decodes the JWT token using the security secret key.
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

      // Security check: Prevents raw MFA challenge tokens from accessing protected application routes.
      if (decoded.purpose === 'mfa-login' || decoded.purpose === 'sms-mfa-login' || decoded.purpose === 'mfa-choice') {
        res.status(403).json({ error: 'Complete MFA verification first.' });
        return;
      }

      // Attaches the extracted and validated user profile data to the Express request object (`req.user`).
      req.user = {
        id: decoded.sub || decoded.email,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role || 'student'
      };

      // Passes control forward to the next middleware function or route controller.
      next();
    } catch (err) {
      // Returns a 403 Forbidden error if token verification fails or the token has expired.
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  }
}