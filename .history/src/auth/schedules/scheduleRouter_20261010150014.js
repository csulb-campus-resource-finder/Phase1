import { Router, Response } from 'express';
import { SSOService, AuthenticatedRequest } from '../auth/ssoService';

export const scheduleRouter = Router();

export interface Course {
  code: string;
  name: string;
  days: string[];
  time: string;
  building: string;
  room: string;
}

const MOCK_SCHEDULES: Record<string, Course[]> = {
  's12345678': [
    { code: 'CECS 491B', name: 'Senior Project II', days: ['Tue', 'Thu'], time: '09:30 AM', building: 'ECS', room: '311' },
    { code: 'CECS 328', name: 'Algorithms', days: ['Mon', 'Wed'], time: '11:00 AM', building: 'VEC', room: '115' },
    { code: 'ENGR 350', name: 'Computers and Society', days: ['Fri'], time: '01:00 PM', building: 'LA5', room: '102' }
  ]
};

scheduleRouter.get('/my-schedule', SSOService.authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 's12345678';
  const schedule = MOCK_SCHEDULES[userId] || MOCK_SCHEDULES['s12345678'];

  res.status(200).json({
    studentId: userId,
    studentName: req.user?.name,
    semester: 'Fall 2026',
    courses: schedule
  });
});

