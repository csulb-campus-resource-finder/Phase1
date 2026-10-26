// Imports the Express framework for building web applications and APIs.
import express from 'express';
// Imports CORS middleware to handle cross-origin resource sharing.
import cors from 'cors';
// Imports the built-in path module for handling file and directory paths.
import path from 'path';
// Imports the Pool class from node-postgres for managing PostgreSQL database connections.
import { Pool } from 'pg';
// Imports multer for handling multipart/form-data file uploads (OCR images & .ics files).
import multer from 'multer';
// Imports tesseract.js for pure JavaScript/WASM OCR image text extraction.
import { createWorker } from 'tesseract.js';
// Imports node-ical for parsing iCalendar files.
import ical from 'node-ical';

// Imports the SSOService module handling Single Sign-On callbacks.
import { SSOService } from './auth/ssoService';
// Imports the schedule API router for managing class schedules.
import { scheduleRouter } from './auth/schedules/scheduleRouter';
// Imports the general authentication API router.
import { authRouter } from './backend/authRouter';
// Imports the MFA router handling multi-factor authentication setup and verification.
import { mfaRouter } from './auth/mfaRouter';
import jwt from 'jsonwebtoken';

// Initializes the Express application instance.
const app = express();
// Sets the server port to the environment variable PORT or defaults to 3001.
const PORT = process.env.PORT || 3001;

// Configures multer to store uploaded files in memory buffers for immediate parsing.
const upload = multer({ storage: multer.memoryStorage() });

// Configures CORS middleware to permit requests from the Vite frontend origin with credentials.
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
// Configures Express to parse incoming JSON request bodies (increased limit to 10MB for base64 avatars).
app.use(express.json({ limit: '10mb' }));
// Serves static files from the public directory using Node's import.meta.dirname.
app.use(express.static(path.join(import.meta.dirname, '../public')));

// Configures the PostgreSQL database connection pool with local credentials or environment config.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://csulb_admin:12162004Hm_runs20@localhost:5432/csulb_platform',
});

// Asynchronous function to auto-initialize database tables and seed initial records on server startup.
async function initializeDatabase() {
  try {
    // 1. Create tables and unique indexes for clean UPSERT support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cached_courses (
          id SERIAL PRIMARY KEY,
          course_code VARCHAR(50) NOT NULL,
          course_name VARCHAR(255) NOT NULL,
          days TEXT[] NOT NULL,
          start_time VARCHAR(10) NOT NULL,
          end_time VARCHAR(10) NOT NULL,
          building VARCHAR(50) NOT NULL,
          room VARCHAR(50) NOT NULL,
          semester VARCHAR(50) DEFAULT 'Fall 2026',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      DROP INDEX IF EXISTS idx_cached_courses_code;
      CREATE UNIQUE INDEX idx_cached_courses_code ON cached_courses (course_code);

      CREATE TABLE IF NOT EXISTS student_enrollments (
          id SERIAL PRIMARY KEY,
          student_identifier VARCHAR(255) NOT NULL,
          course_code VARCHAR(50) NOT NULL,
          course_name VARCHAR(255),
          days TEXT[],
          start_time VARCHAR(10),
          end_time VARCHAR(10),
          building VARCHAR(50),
          room VARCHAR(50)
      );

      -- Remove NOT NULL constraints on enrollment metadata columns to prevent insertion errors
      ALTER TABLE student_enrollments ALTER COLUMN course_name DROP NOT NULL;
      ALTER TABLE student_enrollments ALTER COLUMN days DROP NOT NULL;
      ALTER TABLE student_enrollments ALTER COLUMN start_time DROP NOT NULL;
      ALTER TABLE student_enrollments ALTER COLUMN end_time DROP NOT NULL;
      ALTER TABLE student_enrollments ALTER COLUMN building DROP NOT NULL;
      ALTER TABLE student_enrollments ALTER COLUMN room DROP NOT NULL;

      DROP INDEX IF EXISTS idx_student_enrollments_identifier_code;
      CREATE UNIQUE INDEX idx_student_enrollments_identifier_code ON student_enrollments (student_identifier, course_code);

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret TEXT,
        pending_secret TEXT
      );

      CREATE TABLE IF NOT EXISTS mfa_challenges (
        jti VARCHAR(255) PRIMARY KEY,
        consumed_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_schedules (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          course_code VARCHAR(100) NOT NULL,
          time_window VARCHAR(100) NOT NULL,
          location VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Safely add missing columns to existing tables
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_type VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code_expires TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS major VARCHAR(255) DEFAULT 'Computer Science';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS standing VARCHAR(255) DEFAULT 'Undergraduate (Senior)';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'CSULB student building tools for the Beach community.';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);
    `);

    // 3. Seed initial records
    await pool.query(`
      INSERT INTO users (id, email, name, role, mfa_enabled, phone_number, major, standing, bio)
      VALUES ('nadhirah.michael-ho01@student.csulb.edu', 'nadhirah.michael-ho01@student.csulb.edu', 'Nadhirah Michael-Ho', 'student', FALSE, '+13104087465', 'Computer Science', 'Undergraduate (Senior)', 'CSULB student building tools for the Beach community.')
      ON CONFLICT (id) DO UPDATE SET phone_number = COALESCE(users.phone_number, '+13104087465');
    `);

    console.log('✅ Database tables created and all default records seeded successfully!');
  } catch (err) {
    console.warn('⚠️ Database auto-init warning (check if Docker postgres is running):', err);
  }
}

// Defines a basic root health-check endpoint.
app.get('/', (req, res) => {
  res.send('Campus Resource Finder Phase 1 API is running!');
});

// Helper to extract user identifier from JWT Authorization header
function getUserEmailFromReq(req: any): string {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  let userEmail = 'nadhirah.michael-ho01@student.csulb.edu';
  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'csulb-dev-secret-key-2026');
      if (decoded && decoded.email) userEmail = decoded.email;
      else if (decoded && decoded.id) userEmail = decoded.id;
    } catch (e) {}
  }
  return userEmail;
}

// ----------------------------------------------------
// PROFILE API ENDPOINTS
// ----------------------------------------------------

app.get('/api/v1/profile', async (req: any, res: any) => {
  try {
    const email = getUserEmailFromReq(req);
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1 OR email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const user = userResult.rows[0];
    return res.json({
      name: user.name || '',
      email: user.email || user.id,
      major: user.major || 'Computer Science',
      standing: user.standing || 'Undergraduate (Senior)',
      bio: user.bio || 'CSULB student building tools for the Beach community.',
      phoneNumber: user.phone_number || '',
      profilePicture: user.profile_picture || '',
      githubUrl: user.github_url || '',
      linkedinUrl: user.linkedin_url || ''
    });
  } catch (err: any) {
    console.error('Fetch Profile Error:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

app.put('/api/v1/profile', async (req: any, res: any) => {
  try {
    const email = getUserEmailFromReq(req);
    const { name, major, standing, bio, phoneNumber, githubUrl, linkedinUrl } = req.body;

    await pool.query(`
      UPDATE users 
      SET name = COALESCE($1, name),
          major = COALESCE($2, major),
          standing = COALESCE($3, standing),
          bio = COALESCE($4, bio),
          phone_number = COALESCE($5, phone_number),
          github_url = COALESCE($6, github_url),
          linkedin_url = COALESCE($7, linkedin_url)
      WHERE id = $8 OR email = $8;
    `, [name, major, standing, bio, phoneNumber, githubUrl, linkedinUrl, email]);

    return res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (err: any) {
    console.error('Update Profile Error:', err);
    return res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

// Profile Picture Upload Endpoint
app.post('/api/v1/profile/avatar', upload.single('file'), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a valid image file.' });
  }

  try {
    const email = getUserEmailFromReq(req);
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${b64}`;

    await pool.query(`
      UPDATE users SET profile_picture = $1 WHERE id = $2 OR email = $2;
    `, [dataUri, email]);

    return res.json({ success: true, profilePicture: dataUri });
  } catch (err: any) {
    console.error('Avatar Upload Error:', err);
    return res.status(500).json({ error: 'Failed to upload profile picture.' });
  }
});

// Registers API router endpoints for authentication, SSO, schedules, and MFA.
app.post('/api/auth/sso', SSOService.handleSSOCallback);
app.post('/api/auth/sso-login', SSOService.handleSSOCallback);
app.use('/api/schedules', scheduleRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth/mfa', mfaRouter);

// ----------------------------------------------------
// NEW SCHEDULE PARSER ENDPOINTS (Image OCR & .ics Upload)
// ----------------------------------------------------

// 1. OCR Image Upload Endpoint
app.post('/api/v1/schedule/upload-image', upload.single('file'), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'Please upload a valid image file.' });
  }

  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(req.file.buffer);
    await worker.terminate();

    const rawText = ret.data.text;
    const courseRegex = /([A-Z]{2,4}\s+\d+[A-Z]?\s*-?\s*\d*).*?(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)?/gi;
    
    let match;
    const parsedClasses = [];
    const seen = new Set();
    const userEmail = getUserEmailFromReq(req);

    while ((match = courseRegex.exec(rawText)) !== null) {
      const courseCode = match[1]?.trim();
      if (courseCode && !seen.has(courseCode)) {
        seen.add(courseCode);
        const timeWin = match[2]?.trim() || '09:30 AM - 10:45 AM';
        
        parsedClasses.push({
          course_code: courseCode,
          time_window: timeWin,
          location: 'Engineering & Computer Sci'
        });

        try {
          await pool.query(`
            INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room)
            VALUES ($1, $2, ARRAY['Tue', 'Thu'], '09:30', '10:45', 'ECS', '407')
            ON CONFLICT (course_code) DO UPDATE SET 
              course_name = EXCLUDED.course_name;
          `, [courseCode, courseCode]);
        } catch (dbErr) {
          console.log('Skipping cached course duplicate:', dbErr);
        }

        try {
          await pool.query(`
            INSERT INTO student_enrollments (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
            VALUES ($1, $2, $3, ARRAY['Tue', 'Thu'], '09:30', '10:45', 'ECS', '407')
            ON CONFLICT (student_identifier, course_code) 
            DO UPDATE SET course_name = EXCLUDED.course_name;
          `, [userEmail, courseCode, courseCode]);
        } catch (dbErr) {
          console.log('Skipping student enrollment duplicate:', dbErr);
        }
      }
    }

    if (parsedClasses.length === 0) {
      return res.status(422).json({ detail: 'No valid course schedules could be detected in this image.' });
    }

    return res.json(parsedClasses);
  } catch (err: any) {
    console.error('OCR Processing Error:', err);
    return res.status(500).json({ detail: 'Failed to process schedule image via OCR.' });
  }
});

// 2. .ics Calendar File Upload Endpoint
app.post('/api/v1/schedule/upload-ics', upload.single('file'), async (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ detail: 'Please upload a valid .ics file.' });
  }

  try {
    const fileContent = req.file.buffer.toString('utf8');
    const lines = fileContent.split(/\r?\n/);
    
    const parsedClasses = [];
    const seen = new Set();
    let currentEvent: any = null;
    const userEmail = getUserEmailFromReq(req);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (trimmed === 'END:VEVENT' && currentEvent) {
        if (currentEvent.summary && currentEvent.dtstart) {
          const summary = currentEvent.summary;
          const locationVal = currentEvent.location || 'On Campus';
          
          const startStr = currentEvent.dtstart;
          const year = parseInt(startStr.substring(0, 4), 10) || 2026;
          const month = parseInt(startStr.substring(4, 6), 10) - 1 || 9;
          const day = parseInt(startStr.substring(6, 8), 10) || 20;
          const hour = parseInt(startStr.substring(9, 11) || '0', 10);
          const minute = parseInt(startStr.substring(11, 13) || '0', 10);

          const startDate = new Date(year, month, day, hour, minute);
          const startTimeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          
          let endTimeStr = '10:45';
          if (currentEvent.dtend) {
            const endStr = currentEvent.dtend;
            const endH = parseInt(endStr.substring(9, 11) || '0', 10);
            const endM = parseInt(endStr.substring(11, 13) || '0', 10);
            const endDate = new Date(year, month, day, endH, endM);
            endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          }

          let daysArr = [startDate.toLocaleDateString('en-US', { weekday: 'short' })];
          if (currentEvent.rrule && currentEvent.rrule.includes('BYDAY=')) {
            const match = currentEvent.rrule.match(/BYDAY=([A-Z,]+)/);
            if (match && match[1]) {
              const dayMap: Record<string, string> = {
                'MO': 'Mon', 'TU': 'Tue', 'WE': 'Wed', 'TH': 'Thu', 'FR': 'Fri', 'SA': 'Sat', 'SU': 'Sun'
              };
              daysArr = match[1].split(',').map((d: string) => dayMap[d.trim()] || 'Tue');
            }
          }

          const parts = summary.split('-');
          const courseCode = parts[0]?.trim() || summary;
          const courseName = parts.slice(1).join('-').trim() || 'Seminar';

          const lastSpaceIdx = locationVal.lastIndexOf(' ');
          const building = lastSpaceIdx !== -1 ? locationVal.substring(0, lastSpaceIdx) : locationVal;
          const room = lastSpaceIdx !== -1 ? locationVal.substring(lastSpaceIdx + 1) : '100';

          const eventKey = `${courseCode}-${daysArr.join(',')}`;
          if (!seen.has(eventKey)) {
            seen.add(eventKey);

            parsedClasses.push({
              course_code: courseCode,
              course_name: courseName,
              days: daysArr,
              start_time: startTimeStr,
              end_time: endTimeStr,
              building: building,
              room: room
            });

            try {
              await pool.query(`
                INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (course_code) 
                DO UPDATE SET 
                  course_name = EXCLUDED.course_name,
                  days = EXCLUDED.days,
                  start_time = EXCLUDED.start_time,
                  end_time = EXCLUDED.end_time,
                  building = EXCLUDED.building,
                  room = EXCLUDED.room;
              `, [courseCode, courseName, daysArr, startTimeStr, endTimeStr, building, room]);
            } catch (dbErr) {
              console.log('Skipping cached course duplicate:', dbErr);
            }

            try {
              await pool.query(`
                INSERT INTO student_enrollments (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (student_identifier, course_code) 
                DO UPDATE SET 
                  course_name = EXCLUDED.course_name,
                  days = EXCLUDED.days,
                  start_time = EXCLUDED.start_time,
                  end_time = EXCLUDED.end_time,
                  building = EXCLUDED.building,
                  room = EXCLUDED.room;
              `, [userEmail, courseCode, courseName, daysArr, startTimeStr, endTimeStr, building, room]);
            } catch (dbErr) {
              console.log('Skipping student enrollment duplicate:', dbErr);
            }
          }
        }
        currentEvent = null;
      } else if (currentEvent) {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx !== -1) {
          const key = trimmed.substring(0, colonIdx).split(';')[0].toLowerCase();
          const val = trimmed.substring(colonIdx + 1);
          if (key === 'summary') currentEvent.summary = val;
          if (key === 'location') currentEvent.location = val;
          if (key === 'dtstart') currentEvent.dtstart = val;
          if (key === 'dtend') currentEvent.dtend = val;
          if (key === 'rrule') currentEvent.rrule = val;
        }
      }
    }

    if (parsedClasses.length === 0) {
      return res.status(422).json({ detail: 'No valid calendar events found in the .ics file.' });
    }

    return res.json(parsedClasses);
  } catch (err: any) {
    console.error('ICS Parsing Error:', err);
    return res.status(500).json({ detail: 'Could not parse the iCalendar file.' });
  }
});

// Defines an endpoint returning essential campus emergency contact phone numbers.
app.get('/api/emergency-contacts', (req, res) => {
  res.json({
    campusPolice: '562-985-4101',
    escortService: '562-985-4101',
    healthCenter: '562-985-4141'
  });
});

// Initializes the database schema and seed data before starting the Express server.
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Phase 1 Core Infrastructure running on http://localhost:${PORT}`);
  });
});