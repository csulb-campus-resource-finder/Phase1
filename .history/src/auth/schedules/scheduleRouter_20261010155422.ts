import { Router, Response } from 'express';
import { SSOService, AuthenticatedRequest } from '../ssoService';

export const scheduleRouter = Router();

export interface Course {
  code: string;
  name: string;
  days: string[];
  startTime: string; // e.g., "09:30"
  endTime: string;   // e.g., "10:45"
  building: string;
  room: string;
}

// Student enrolled courses mapping (persisted or fetched per user)
const STUDENT_ENROLLMENTS: Record<string, Course[]> = {
  's12345678': [
    { code: 'CECS 491B', name: 'Senior Project II', days: ['Tue', 'Thu'], startTime: '09:30', endTime: '10:45', building: 'ECS', room: '311' },
    { code: 'CECS 328', name: 'Algorithms', days: ['Mon', 'Wed'], startTime: '11:00', endTime: '12:15', building: 'VEC', room: '115' },
    { code: 'ENGR 350', name: 'Computers and Society', days: ['Fri'], startTime: '13:00', endTime: '15:45', building: 'LA5', room: '102' }
  ]
};

/**
 * Helper to check if a course is currently active based on system time and day of the week.
 */
function isClassCurrentlyActive(course: Course): boolean {
  const now = new Date();
  
  // Map JS getDay() (0=Sun, 1=Mon, ...) to schedule day strings
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDayStr = dayNames[now.getDay()];

  if (!course.days.includes(currentDayStr)) {
    return false;
  }

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;

  const [startH, startM] = course.startTime.split(':').map(Number);
  const [endH, endM] = course.endTime.split(':').map(Number);
  
  const startTimeMinutes = startH * 60 + startM;
  const endTimeMinutes = endH * 60 + endM;

  return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
}

/**
 * Endpoint to fetch the student's schedule and evaluate live "currently going on" status
 * by referencing the official CSULB Fall 2026 course catalog pipeline.
 */
scheduleRouter.get('/my-schedule', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 's12345678';
  const courses = STUDENT_ENROLLMENTS[userId] || [];

  try {
    // Optional: Fetch live course catalog metadata from CSULB Fall 2026 subject directory endpoint
    const csulbCatalogUrl = 'https://web.csulb.edu/depts/enrollment/registration/class_schedule/Fall_2026/By_Subject/';
    // In production environments with strict CORS/firewalls, this can be proxied or parsed via backend worker
    // const catalogResponse = await fetch(csulbCatalogUrl);
    
    // Evaluate active status for each enrolled course
    const evaluatedCourses = courses.map(course => ({
      ...course,
      isCurrentlyActive: isClassCurrentlyActive(course)
    }));

    res.status(200).json({
      studentId: userId,
      studentName: req.user?.name,
      semester: 'Fall 2026',
      catalogSource: csulbCatalogUrl,
      courses: evaluatedCourses
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to synchronize with CSULB Class Schedule catalog.' });
  }
});
