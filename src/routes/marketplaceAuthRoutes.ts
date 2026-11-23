import { Router } from 'express';
import {
  AuthenticatedRequest,
  authenticateRequest,
  authorizeRoles,
} from '../auth/middleware.js';

const router = Router();

const MARKETPLACE_ROLES = [
  'buyer',
  'seller',
  'student',
  'student buyer',
  'student seller',
  'admin',
];

router.post(
  '/protected-feature',
  authenticateRequest,
  authorizeRoles(MARKETPLACE_ROLES),
  (req: AuthenticatedRequest, res: any) => {
    res.status(200).json({
      message: 'Access granted to authorized user.',
      user: req.user,
    });
  }
);

router.get(
  '/admin/dashboard',
  authenticateRequest,
  authorizeRoles(['admin'], ['nadhirah.michael-ho01@student.csulb.edu']),
  (req: AuthenticatedRequest, res: any) => {
    res.status(200).json({
      message: 'Welcome to the admin dashboard.',
      user: req.user,
    });
  }
);

export default router;