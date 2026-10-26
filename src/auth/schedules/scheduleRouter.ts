// Imports Router and Response types from the Express framework.
import { Router, Response } from 'express';
// Imports custom SSO authentication services and the AuthenticatedRequest type definition.
import { SSOService, AuthenticatedRequest } from '../ssoService';
// Imports the Pool class from the 'pg' (node-postgres) library for database connection management.
import { Pool } from 'pg';
// Imports Axios HTTP client library (included for external requests if needed).
import axios from 'axios';

// Initializes and exports an Express Router instance specifically for schedule routes.
export const scheduleRouter = Router();

// Configures and initializes a new PostgreSQL connection pool.
const pool = new Pool({
  // Uses the DATABASE_URL environment variable, or falls back to a default local connection string.
  connectionString: process.env.DATABASE_URL || 'postgresql://csulb_admin:12162004Hm_runs20@localhost:5432/csulb_platform',
  // Enables SSL with unauthorized certificate rejection disabled if running in a production environment.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Defines a TypeScript interface representing the structure of a Course object.
export interface Course {
  code: string;                 // Course code (e.g., 'CECS 323')
  name: string;                 // Course title/name
  days: string[];               // Array of days the class meets (e.g., ['Tue', 'Thu'])
  startTime: string;            // Start time in HH:MM 24-hour format
  endTime: string;              // End time in HH:MM 24-hour format
  building: string;             // Building abbreviation or name
  room: string;                 // Room number
  isCurrentlyActive?: boolean;  // Optional flag indicating if class is happening right now
}

// Defines a static array of fallback courses to use if the database is unreachable or empty.
const FALLBACK_COURSES: Course[] = [
  { code: 'CECS 323', name: 'Database Fundamentals', days: ['Tue', 'Thu'], startTime: '09:30', endTime: '10:45', building: 'ECS', room: '311' },
  { code: 'CECS 457', name: 'Applied Machine Learning', days: ['Mon', 'Wed'], startTime: '11:00', endTime: '12:15', building: 'VEC', room: '115' },
  { code: 'CECS 450', name: 'Data Visualization', days: ['Tue', 'Thu'], startTime: '12:30', endTime: '13:45', building: 'ECS', room: '412' },
  { code: 'CECS 491A', name: 'Computer Science Senior Project I', days: ['Mon', 'Wed'], startTime: '14:00', endTime: '15:15', building: 'ECS', room: '304' }
];

// Helper function that determines if a specific course is currently in session right now.
function isClassCurrentlyActive(course: Course): boolean {
  // Gets the current local date and time.
  const now = new Date();
  // Maps numeric day indices (0-6) to standard 3-letter day strings.
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDayStr = dayNames[now.getDay()];

  // If the course doesn't have scheduled days or doesn't meet today, it's not active.
  if (!course.days || !course.days.includes(currentDayStr)) {
    return false;
  }

  // Extracts current hours and minutes, then converts total time into minutes elapsed today.
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;

  // Splits and parses start time hours and minutes.
  const [startH, startM] = course.startTime.split(':').map(Number);
  // Splits and parses end time hours and minutes.
  const [endH, endM] = course.endTime.split(':').map(Number);
  
  // Converts course start and end times into total minutes elapsed today.
  const startTimeMinutes = startH * 60 + startM;
  const endTimeMinutes = endH * 60 + endM;

  // Returns true if the current time falls inclusively between start and end time minutes.
  return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
}

// 1. GET endpoint to retrieve the student's current schedule, secured with SSO token authentication.
scheduleRouter.get('/my-schedule', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // Extracts user ID from the authenticated request, with a default fallback email.
  const userId = req.user?.id || 'nadhirah.michael-ho01@student.csulb.edu';
  // Extracts user email from the authenticated request, with a default fallback email.
  const userEmail = req.user?.email || 'nadhirah.michael-ho01@student.csulb.edu';

  // Initializes an empty array to hold the retrieved courses.
  let courses: Course[] = [];

  try {
    // Queries the PostgreSQL database for student enrollments matching either user ID or email.
    const result = await pool.query(
      `SELECT course_code as code, course_name as name, days, start_time as "startTime", end_time as "endTime", building, room 
       FROM student_enrollments WHERE student_identifier = $1 OR student_identifier = $2`,
      [userId, userEmail]
    );

    // If rows are returned from the database, assign them to the courses array.
    if (result.rows && result.rows.length > 0) {
      courses = result.rows;
    }
  } catch (dbError) {
    // Logs a warning if the database query fails and proceeds to use fallbacks.
    console.warn('⚠️ Database query warning (using fallback courses instead):', dbError);
  }

  // If no courses were found in the database, fallback to the default mock course list.
  if (courses.length === 0) {
    courses = FALLBACK_COURSES;
  }

  // Evaluates every course in the list to check if it is currently active.
  const evaluatedCourses = courses.map(course => ({
    ...course,
    isCurrentlyActive: isClassCurrentlyActive(course)
  }));

  // Returns a 200 OK HTTP response with student details, semester metadata, and evaluated courses.
  return res.status(200).json({
    studentId: userEmail,
    studentName: req.user?.name || 'Nadhirah Michael-Ho',
    semester: 'Fall 2026',
    catalogSource: 'CSULB Database Registry & Fallback Engine',
    courses: evaluatedCourses
  });
});

// 2. POST endpoint to sync student course schedules securely, protected by SSO authentication.
scheduleRouter.post('/sync', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // Retrieves the student email from the authenticated user token context.
  const studentEmail = req.user?.email || 'nadhirah.michael-ho01@student.csulb.edu';
  // Extracts the courses array from the incoming request body payload.
  const { courses } = req.body;

  // Validates that the courses payload exists and is formatted as an array.
  if (!courses || !Array.isArray(courses)) {
    return res.status(400).json({ error: 'Invalid course payload provided for syncing.' });
  }

  // Acquires a dedicated database client from the connection pool.
  const client = await pool.connect();
  try {
    // Starts a database transaction to ensure atomicity during bulk sync updates.
    await client.query('BEGIN');

    // Loops through each course provided in the synchronization payload.
    for (const course of courses) {
      // Checks if an enrollment record already exists for this student and course code.
      const existing = await client.query(
        `SELECT id FROM student_enrollments WHERE student_identifier = $1 AND course_code = $2`,
        [studentEmail, course.code]
      );

      // Ensures days data is formatted properly as an array (splits strings by commas if necessary).
      const formattedDays = Array.isArray(course.days) 
        ? course.days 
        : (typeof course.days === 'string' ? course.days.split(',').map((d: string) => d.trim()) : ['Mon', 'Wed']);

      // If the course already exists in the database, update its details.
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE student_enrollments 
           SET course_name = $3, days = $4, start_time = $5, end_time = $6, building = $7, room = $8
           WHERE student_identifier = $1 AND course_code = $2`,
          [
            studentEmail,
            course.code,
            course.name || 'General Course',
            formattedDays,
            course.startTime || '10:00',
            course.endTime || '11:15',
            course.building || 'ECS',
            course.room || '100'
          ]
        );
      } else {
        // If the course does not exist, insert a new enrollment record.
        await client.query(
          `INSERT INTO student_enrollments 
           (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            studentEmail,
            course.code || 'GEN 101',
            course.name || 'General Course',
            formattedDays,
            course.startTime || '10:00',
            course.endTime || '11:15',
            course.building || 'ECS',
            course.room || '100'
          ]
        );
      }
    }

    // Commits the database transaction if all inserts/updates succeed.
    await client.query('COMMIT');
    // Returns a success JSON response indicating the schedule synchronized correctly.
    return res.status(200).json({ success: true, message: 'Schedule synchronized successfully.' });

  } catch (error: any) {
    // Rolls back all database changes in this transaction if any error occurs.
    await client.query('ROLLBACK');
    // Logs the error to the server console.
    console.error('Schedule sync error:', error);
    // Returns a 500 Internal Server Error response with the error message.
    return res.status(500).json({ error: error.message || 'Failed to synchronize schedule data.' });
  } finally {
    // Releases the database client connection back to the pool.
    client.release();
  }
});

// 3. DELETE endpoint to remove a specific course enrollment by code, secured with SSO authentication.
scheduleRouter.delete('/:code', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // Extracts the student email from the authenticated request user context.
  const studentEmail = req.user?.email || 'nadhirah.michael-ho01@student.csulb.edu';
  // Extracts the course code dynamic route parameter from the URL path.
  const courseCode = req.params.code;

  try {
    // Executes a SQL DELETE query to remove the specific enrollment matching the student and course code.
    const result = await pool.query(
      `DELETE FROM student_enrollments WHERE student_identifier = $1 AND course_code = $2`,
      [studentEmail, courseCode]
    );

    // Returns a 200 OK success response confirming the course was deleted.
    return res.status(200).json({ 
      success: true, 
      message: `Course ${courseCode} removed successfully.` 
    });
  } catch (error: any) {
    // Logs any deletion errors to the console.
    console.error('Error deleting course:', error);
    // Returns a 500 Internal Server Error response if deletion fails.
    return res.status(500).json({ error: 'Failed to delete course.' });
  }
});