import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

export type UserRole = 'buyer' | 'seller' | 'student' | 'student buyer' | 'student seller' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

function normalizeRole(rawRole: unknown): string {
  return String(rawRole || '').trim().toLowerCase();
}

/**
 * Extracts and verifies the caller from Bearer JWT or x-user-email / x-user-role headers.
 */
export async function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let email = String(req.headers['x-user-email'] || '').trim().toLowerCase();
    let role = normalizeRole(req.headers['x-user-role']);
    let id = '';

    const authHeader = req.headers['authorization'];
    const token =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET || 'csulb-dev-secret-key-2026'
        );
        id = String(decoded?.id || decoded?.userId || decoded?.email || '').trim();
        if (!email && decoded?.email) {
          email = String(decoded.email).trim().toLowerCase();
        }
        if (!role && decoded?.role) {
          role = normalizeRole(decoded.role);
        }
      } catch {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
      }
    }

    if (!email) {
      return res.status(401).json({ error: 'Unauthorized: No user session or email found.' });
    }

    if (!role && process.env.DATABASE_URL) {
      try {
        const result = await pool.query(
          'SELECT id, role FROM users WHERE LOWER(email) = $1 LIMIT 1',
          [email]
        );
        if (result.rows[0]) {
          id = id || String(result.rows[0].id || email);
          role = normalizeRole(result.rows[0].role);
        }
      } catch {
        // Keep empty role if users table is not present in a test environment
      }
    }

    req.user = {
      id: id || email,
      email,
      role: role || 'buyer',
    };

    return next();
  } catch {
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

/**
 * Restricts access to permitted roles and optional email allowlist.
 */
export const authorizeRoles = (
  allowedRoles: Array<UserRole | string>,
  allowedEmails?: string[]
) => {
  const normalizedRoles = allowedRoles.map((r) => normalizeRole(r));
  const normalizedEmails = allowedEmails?.map((e) => e.trim().toLowerCase());

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        await new Promise<void>((resolve, reject) => {
          authenticateRequest(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
        if (res.headersSent) return;
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: No user session found.' });
      }

      const hasValidRole =
        normalizedRoles.length === 0 || normalizedRoles.includes(normalizeRole(user.role));

      const hasValidEmail =
        !normalizedEmails ||
        normalizedEmails.length === 0 ||
        normalizedEmails.includes(user.email.toLowerCase());

      if (!hasValidRole || !hasValidEmail) {
        return res.status(403).json({
          error: 'Forbidden: You do not have the required permissions to access this resource.',
        });
      }

      return next();
    } catch {
      return res.status(500).json({ error: 'Internal server error during authorization.' });
    }
  };
};