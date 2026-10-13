import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { SSOService } from './ssoService';

export const authRouter = Router();

// Uses your exact SSOService method
authRouter.post('/sso-login', SSOService.handleSSOCallback);

const JWT_SECRET = process.env.JWT_SECRET || 'csulb-dev-secret-key-2026';

export interface CSULBUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'faculty' | 'staff';
}

export interface AuthenticatedRequest extends Request {
  user?: CSULBUser;
}

export class SSOService {
  public static handleSSOCallback(req: Request, res: Response): void {
    const { email, name } = req.body;

    if (!email || !email.endsWith('@student.csulb.edu')) {
      res.status(401).json({ error: 'Unauthorized: Access restricted to CSULB SSO accounts.' });
      return;
    }

    const user: CSULBUser = {
      id: email.split('@')[0],
      email,
      name: name || 'CSULB Student',
      role: 'student'
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, user });
  }

  public static authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as CSULBUser;
      req.user = decoded;
      next();
    } catch {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  }
}

