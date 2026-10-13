import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const authRouter = Router();

// Secret key for JWT signing (use an environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'csulb_campus_resource_secret_key';

// Mock student database
const STUDENTS: Record<string, { id: string; name: string; email: string }> = {
  's12345678': { id: 's12345678', name: 'Nadhirah Michael-Ho', email: 'nadhirah@student.csulb.edu' }
};

/**
 * Mock SSO Login Route
 */
authRouter.post('/login', (req: Request, res: Response) => {
  const { studentId } = req.body;

  const student = STUDENTS[studentId] || {
    id: studentId || 's12345678',
    name: 'CSULB Student',
    email: `${studentId || 'student'}@student.csulb.edu`
  };

  // Generate a JWT token valid for 24 hours
  const token = jwt.sign(student, JWT_SECRET, { expiresIn: '24h' });

  res.status(200).json({
    message: 'Authentication successful',
    token,
    user: student
  });
});