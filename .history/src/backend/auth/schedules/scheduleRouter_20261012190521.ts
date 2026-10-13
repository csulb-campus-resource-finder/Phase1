import { Router, Response } from 'express';
import { SSOService, AuthenticatedRequest } from '.../ssoService';
import { Pool } from 'pg';

export const scheduleRouter = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export interface Course {
  code: string;
  name: string;
  days: string[];
  startTime: string; 
  endTime: string;   
  building: string;
  room: string;
  isCurrentlyActive?: boolean;
}

const FALLBACK_COURSES: Course[] = [
  { code: 'CECS 323', name: 'Database Fundamentals', days: ['Tue', 'Thu'], startTime: '09:30', endTime: '10:45', building: 'ECS', room: '311' },
  { code: 'CECS 457', name: 'Applied Machine Learning', days: ['Mon', 'Wed'], startTime: '11:00', endTime: '12:15', building: 'VEC', room: '115' },
  { code: 'CECS 450', name: 'Data Visualization', days: ['Tue', 'Thu'], startTime: '12:30', endTime: '13:45', building: 'ECS', room: '412' },
  { code: 'CECS 491A', name: 'Computer Science Senior Project I', days: ['Mon', 'Wed'], startTime: '14:00', endTime: '15:15', building: 'ECS', room: '304' }
];

function isClassCurrentlyActive(course: Course): boolean {
  const now = new Date();
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

scheduleRouter.get('/my-schedule', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id || 's12345678';
  const userEmail = req.user?.email || 'nadhirah.michael-ho01@student.csulb.edu';

  try {
    // Query NeonDB for student's enrolled course codes
    const enrollmentResult = await pool.query(
      `SELECT course_code FROM student_enrollments WHERE student_identifier = $1 OR student_identifier = $2`,
      [userId, userEmail]
    );

    const enrolledCodes = enrollmentResult.rows.map(row => row.course_code);

    let courses: Course[] = [];

    if (enrolledCodes.length > 0) {
      // Fetch course details from cached catalog table
      const coursesResult = await pool.query(
        `SELECT course_code as code, course_name as name, days, start_time as "startTime", end_time as "endTime", building, room 
         FROM cached_courses WHERE course_code = ANY($1)`,
        [enrolledCodes]
      );
      courses = coursesResult.rows;
    }

    // Fallback if database returns empty
    if (courses.length === 0) {
      courses = FALLBACK_COURSES;
    }

    const evaluatedCourses = courses.map(course => ({
      ...course,
      isCurrentlyActive: isClassCurrentlyActive(course)
    }));

    res.status(200).json({
      studentId: userEmail,
      studentName: req.user?.name || 'Nadhirah Michael-Ho',
      semester: 'Fall 2026',
      catalogSource: 'NeonDB Cached CSULB Registry',
      courses: evaluatedCourses
    });
  } catch (error) {
    console.error('Database schedule query error:', error);
    res.status(500).json({ error: 'Failed to retrieve schedule from database catalog.' });
  }
});