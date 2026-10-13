import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { SSOService } from './ssoService';

export const authRouter = Router();

// Use your official SSOService callback which handles @student.csulb.edu verification
authRouter.post('/sso-login', SSOService.handleSSOCallback);

// Optional: keep your manual login fallback if needed
const JWT_SECRET = process.env.JWT_SECRET || 'csulb_campus_resource_secret_key';
const STUDENTS: Record<string, { id: string; name: string; email: string }> = {
  's12345678': { id: 's12345678', name: 'Nadhirah Michael-Ho', email: 'nadhirah@student.csulb.edu' }
};

authRouter.post('/login', (req: Request, res: Response) => {
  const { studentId } = req.body;
  const student = STUDENTS[studentId] || {
    id: studentId || 's12345678',
    name: 'CSULB Student',
    email: `${studentId || 'student'}@student.csulb.edu`
  };
  const token = jwt.sign(student, JWT_SECRET, { expiresIn: '24h' });
  res.status(200).json({
    message: 'Authentication successful',
    token,
    user: student
  });
});