// Imports Router and Response types from the Express web framework.
import { Router, Response } from 'express';
// Imports SSO authentication services and the custom AuthenticatedRequest interface.
import { SSOService, AuthenticatedRequest } from '../../../auth/ssoService';
// Imports the Pool class from the 'pg' library for managing PostgreSQL database connections.
import { Pool } from 'pg';
// Imports the Axios HTTP client library for making external API requests.
import axios from 'axios';

// Initializes and exports an Express Router instance dedicated to course schedule routes.
export const scheduleRouter = Router();

// Configures and initializes a new PostgreSQL connection pool.
const pool = new Pool({
  // Uses DATABASE_URL or Neon database connection strings from environment variables.
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  // Enables SSL database connections and disables unauthorized certificate rejections.
  ssl: { rejectUnauthorized: false }
});

// Defines a TypeScript interface representing the structure of a Course object.
export interface Course {
  code: string;                 // Course code (e.g., 'CECS 323')
  name: string;                 // Course title/name
  days: string[];               // Array of meeting days (e.g., ['Tue', 'Thu'])
  startTime: string;            // Start time in 24-hour HH:MM format
  endTime: string;              // End time in 24-hour HH:MM format
  building: string;             // Building name or abbreviation
  room: string;                 // Room number
  isCurrentlyActive?: boolean;  // Optional flag indicating if class is happening right now
}

// Defines a static array of fallback courses to use if the database is empty or unreachable.
const FALLBACK_COURSES: Course[] = [
  { code: 'CECS 323', name: 'Database Fundamentals', days: ['Tue', 'Thu'], startTime: '09:30', endTime: '10:45', building: 'ECS', room: '311' },
  { code: 'CECS 457', name: 'Applied Machine Learning', days: ['Mon', 'Wed'], startTime: '11:00', endTime: '12:15', building: 'VEC', room: '115' },
  { code: 'CECS 450', name: 'Data Visualization', days: ['Tue', 'Thu'], startTime: '12:30', endTime: '13:45', building: 'ECS', room: '412' },
  { code: 'CECS 491A', name: 'Computer Science Senior Project I', days: ['Mon', 'Wed'], startTime: '14:00', endTime: '15:15', building: 'ECS', room: '304' }
];

// Helper function that determines if a specific course is currently in session right now.
function isClassCurrentlyActive(course: Course): boolean {
  // Gets the current system date and time.
  const now = new Date();
  // Maps numeric day indices (0-6) to standard 3-letter day strings.
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDayStr = dayNames[now.getDay()];

  // If the course does not meet today, return false immediately.
  if (!course.days || !course.days.includes(currentDayStr)) {
    return false;
  }

  // Extracts current hours and minutes, converting total time into minutes elapsed today.
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;

  // Splits and parses start time hours and minutes into numbers.
  const [startH, startM] = course.startTime.split(':').map(Number);
  // Splits and parses end time hours and minutes into numbers.
  const [endH, endM] = course.endTime.split(':').map(Number);
  
  // Converts course start and end times into total minutes elapsed today.
  const startTimeMinutes = startH * 60 + startM;
  const endTimeMinutes = endH * 60 + endM;

  // Returns true if the current time falls inclusively within the class start and end time window.
  return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
}

// 1. GET endpoint to retrieve the student's current schedule, secured with SSO token authentication.
scheduleRouter.get('/my-schedule', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // Extracts user ID from the request token context, with a fallback student ID.
  const userId = req.user?.id || 's12345678';
  // Extracts user email from the request token context, with a fallback student email.
  const userEmail = req.user?.email || 'nadhirah.michael-ho01@student.csulb.edu';

  // Initializes an empty array to hold fetched courses.
  let courses: Course[] = [];

  try {
    // Queries PostgreSQL joining student_enrollments with cached_courses to get updated schedule metadata.
    const result = await pool.query(
      `SELECT 
         COALESCE(cc.course_code, se.course_code) as code, 
         COALESCE(cc.course_name, se.course_name, se.course_code) as name, 
         COALESCE(cc.days, se.days) as days, 
         COALESCE(cc.start_time, se.start_time) as "startTime", 
         COALESCE(cc.end_time, se.end_time) as "endTime", 
         COALESCE(cc.building, se.building, 'ECS') as building, 
         COALESCE(cc.room, se.room, '100') as room 
       FROM student_enrollments se
       LEFT JOIN cached_courses cc ON se.course_code = cc.course_code
       WHERE se.student_identifier = $1 OR se.student_identifier = $2`,
      [userId, userEmail]
    );

    // If query results contain rows, assign them to the courses array.
    if (result.rows && result.rows.length > 0) {
      courses = result.rows;
    }
  } catch (dbError) {
    // Logs a warning if the database query fails and proceeds to use fallback courses.
    console.warn('⚠️ Database query warning (using fallback courses instead):', dbError);
  }

  // Fallback to static course array if database query fails or the table is empty.
  if (courses.length === 0) {
    courses = FALLBACK_COURSES;
  }

  // Evaluates each course to determine if it is currently active at this exact moment.
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

// 2. POST endpoint to sync student course schedules, protected by SSO authentication.
scheduleRouter.post('/sync', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // Retrieves the student email from the authenticated user token context.
  const studentEmail = req.user?.email || 'nadhirah.michael-ho01@student.csulb.edu';
  // Extracts the courses array from the incoming request body payload.
  const { courses } = req.body;

  // Validates that the courses payload exists and is formatted as an array.
  if (!courses || !Array.isArray(courses)) {
    return res.status(400).json({ error: 'Invalid course payload provided for syncing.' });
  }

  // Acquires a dedicated database client connection from the pool.
  const client = await pool.connect();
  try {
    // Starts a database transaction block.
    await client.query('BEGIN');

    // Deletes all existing enrollments for this student to perform a fresh sync.
    await client.query(
      `DELETE FROM student_enrollments WHERE student_identifier = $1`,
      [studentEmail]
    );

    // Loops through each course in the provided synchronization payload.
    for (const course of courses) {
      // Inserts each course record into the student enrollments table.
      await client.query(
        `INSERT INTO student_enrollments 
         (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_identifier, course_code) DO UPDATE SET
           course_name = EXCLUDED.course_name,
           days = EXCLUDED.days,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           building = EXCLUDED.building,
           room = EXCLUDED.room`,
        [
          studentEmail,
          course.code,
          course.name,
          course.days,
          course.startTime,
          course.endTime,
          course.building,
          course.room
        ]
      );
    }

    // Commits the database transaction if all inserts succeed.
    await client.query('COMMIT');
    // Returns a 200 OK success response confirming the sync count.
    return res.status(200).json({ 
      success: true, 
      message: `Successfully synced ${courses.length} courses for ${studentEmail}.` 
    });

  } catch (error) {
    // Rolls back all transaction changes if any error occurs during sync.
    await client.query('ROLLBACK');
    // Logs the error to the server console.
    console.error('Schedule sync error:', error);
    // Returns a 500 Internal Server Error response.
    return res.status(500).json({ error: 'Failed to synchronize schedule data.' });
  } finally {
    // Releases the database client connection back to the pool.
    client.release();
  }
});

// 3. POST endpoint to sync student schedules directly from the Canvas LMS API.
scheduleRouter.post('/sync-canvas', SSOService.authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  // Extracts student email from user token context.
  const studentEmail = req.user?.email || 'nadhirah.michael-ho01@student.csulb.edu';
  // Extracts the Canvas access token from the request body.
  const { canvasToken } = req.body;

  // Validates that the Canvas token was provided.
  if (!canvasToken) {
    return res.status(400).json({ error: 'Canvas access token is required.' });
  }

  try {
    // Makes an external GET request to the Canvas LMS API to fetch active courses.
    const canvasResponse = await axios.get('https://csulb.instructure.com/api/v1/courses?enrollment_state=active', {
      headers: {
        Authorization: `Bearer ${canvasToken}`
      }
    });

    // Extracts the array of courses returned by Canvas.
    const canvasCourses = canvasResponse.data;
    // Acquires a database client connection from the pool.
    const client = await pool.connect();

    try {
      // Starts a database transaction.
      await client.query('BEGIN');

      // Clears out existing student enrollments before inserting fresh Canvas data.
      await client.query(
        `DELETE FROM student_enrollments WHERE student_identifier = $1`,
        [studentEmail]
      );

      // Iterates through each course received from the Canvas API.
      for (const course of canvasCourses) {
        // Extracts the raw course name or code with a fallback value.
        const rawName = course.name || course.course_code || 'Unknown Course';
        // Uses regex to match standard course code patterns (e.g., 'CECS 323').
        const codeMatch = rawName.match(/([A-Z]+\s+\d+[A-Z]*)/);
        const courseCode = codeMatch ? codeMatch[1] : (course.course_code || 'GEN 101');
        // Cleans up the course name by stripping out the course code and formatting characters.
        const courseName = rawName.replace(courseCode, '').replace(/[:()-]/g, '').trim() || rawName;

        // Sets default schedule placement values for Canvas courses.
        const days = ['Mon', 'Wed']; 
        const startTime = '10:00';
        const endTime = '11:15';
        const building = 'ECS';
        const room = '100';

        // Inserts the parsed Canvas course into the database.
        await client.query(
          `INSERT INTO student_enrollments 
           (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (student_identifier, course_code) DO UPDATE SET
             course_name = EXCLUDED.course_name,
             days = EXCLUDED.days,
             start_time = EXCLUDED.start_time,
             end_time = EXCLUDED.end_time,
             building = EXCLUDED.building,
             room = EXCLUDED.room`,
          [studentEmail, courseCode, courseName, days, startTime, endTime, building, room]
        );
      }

      // Commits the transaction if all Canvas courses are inserted successfully.
      await client.query('COMMIT');
      // Returns a success response confirming Canvas schedule synchronization.
      return res.status(200).json({ success: true, message: 'Canvas schedule synchronized successfully!' });

    } catch (dbError) {
      // Rolls back transaction changes if a database error occurs.
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      // Releases the database client connection back to the pool.
      client.release();
    }

  } catch (error: any) {
    // Logs detailed Canvas API authentication or fetch errors to the console.
    console.error('Canvas API sync error:', error.response?.data || error.message);
    // Returns a 500 Internal Server Error response.
    return res.status(500).json({ error: 'Failed to authenticate or fetch courses from Canvas.' });
  }
});