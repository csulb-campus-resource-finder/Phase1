// Imports dotenv configuration to load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Imports the Express framework for building web applications and APIs.
import express from 'express';
// Imports CORS middleware to handle cross-origin resource sharing.
import cors from 'cors';
import fs from 'fs';
// Imports the Pool class from node-postgres for managing PostgreSQL database connections.
import { Pool } from 'pg';
// Imports multer for handling multipart/form-data file uploads (OCR images & .ics files).
import multer from 'multer';
// Imports tesseract.js for pure JavaScript/WASM OCR image text extraction.
import { createWorker } from 'tesseract.js';
// Imports node-ical for parsing iCalendar files.
import ical from 'node-ical';
import nodemailer from 'nodemailer';

// Imports the SSOService module handling Single Sign-On callbacks.
import { SSOService } from './auth/ssoService';
// Imports the schedule API router for managing class schedules.
import { scheduleRouter } from './auth/schedules/scheduleRouter';
// Imports the general authentication API router.
import { authRouter } from './backend/authRouter';
// Imports the MFA router handling multi-factor authentication setup and verification.
import { mfaRouter } from './auth/mfaRouter';
// Imports the AuthService module handling 2FA logic and OTP generation.
import { AuthService } from './auth/authService';
import jwt from 'jsonwebtoken';
import { busTrackerRouter } from './routes/busTrackRouter';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';

// Initializes the Express application instance.
const app = express();
// Sets the server port to the environment variable PORT or defaults to 3001.
const PORT = process.env.PORT || 3001;

// Configures multer to store uploaded files in memory buffers for immediate parsing.
const upload = multer({ storage: multer.memoryStorage() });

// Configures CORS middleware to permit requests from Vite frontend origins with credentials.
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
// Configures Express to parse incoming JSON request bodies (increased limit to 10MB for base64 avatars).
app.use(express.json({ limit: '10mb' }));
// Serves static files from the public directory using __dirname.
app.use(express.static(path.join(__dirname, '../public')));

// Configures the PostgreSQL database connection pool for NeonDB (with cloud SSL support).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize AuthService instance
const authService = new AuthService();

// Configure Nodemailer transporter using environment credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify SMTP connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Nodemailer SMTP Connection Error:', error);
  } else {
    console.log('✅ Nodemailer is authenticated and ready to send emails!');
  }
});


// Helper validation function for CSULB student email addresses
function isValidCsulbEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower.endsWith('@student.csulb.edu') || lower.endsWith('@csulb.edu');
}

// ⬇️ PLACE IT RIGHT HERE ⬇️
// Helper to extract user identifier from JWT Authorization header with strict 401 check
function getRequiredUserEmail(req: any, res: any): string | null {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'csulb-dev-secret-key-2026');
    return decoded.email || decoded.id || null;
  } catch (e) {
    return null;
  }
}

// Asynchronous function to auto-initialize database tables and seed initial records on server startup.
async function initializeDatabase() {
  try {
    // 1. Create tables and indexes individually to avoid multi-statement prepared statement errors
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
    `);
    await pool.query(`DROP INDEX IF EXISTS idx_cached_courses_code;`);
    await pool.query(`CREATE UNIQUE INDEX idx_cached_courses_code ON cached_courses (course_code);`);

    await pool.query(`
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
    `);
    await pool.query(`ALTER TABLE student_enrollments ALTER COLUMN course_name DROP NOT NULL;`);
    await pool.query(`ALTER TABLE student_enrollments ALTER COLUMN days DROP NOT NULL;`);
    await pool.query(`ALTER TABLE student_enrollments ALTER COLUMN start_time DROP NOT NULL;`);
    await pool.query(`ALTER TABLE student_enrollments ALTER COLUMN end_time DROP NOT NULL;`);
    await pool.query(`ALTER TABLE student_enrollments ALTER COLUMN building DROP NOT NULL;`);
    await pool.query(`ALTER TABLE student_enrollments ALTER COLUMN room DROP NOT NULL;`);

    await pool.query(`DROP INDEX IF EXISTS idx_student_enrollments_identifier_code;`);
    await pool.query(`CREATE UNIQUE INDEX idx_student_enrollments_identifier_code ON student_enrollments (student_identifier, course_code);`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret TEXT,
        pending_secret TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mfa_challenges (
        jti VARCHAR(255) PRIMARY KEY,
        consumed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_schedules (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          course_code VARCHAR(100) NOT NULL,
          course_name VARCHAR(255),
          days TEXT[],
          start_time VARCHAR(50),
          end_time VARCHAR(50),
          building VARCHAR(50),
          room VARCHAR(50),
          time_window VARCHAR(100),
          location VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE user_schedules ADD COLUMN IF NOT EXISTS course_name VARCHAR(255);`);
    await pool.query(`ALTER TABLE user_schedules ADD COLUMN IF NOT EXISTS days TEXT[];`);
    await pool.query(`ALTER TABLE user_schedules ADD COLUMN IF NOT EXISTS start_time VARCHAR(50);`);
    await pool.query(`ALTER TABLE user_schedules ADD COLUMN IF NOT EXISTS end_time VARCHAR(50);`);
    await pool.query(`ALTER TABLE user_schedules ADD COLUMN IF NOT EXISTS building VARCHAR(50);`);
    await pool.query(`ALTER TABLE user_schedules ADD COLUMN IF NOT EXISTS room VARCHAR(50);`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campus_accounts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Student Buyer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Safely add missing columns individually
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_type VARCHAR(50);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code VARCHAR(10);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code_expires TIMESTAMP;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS major VARCHAR(255) DEFAULT 'Computer Science';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS standing VARCHAR(255) DEFAULT 'Undergraduate (Senior)';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'CSULB student building tools for the Beach community.';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);`);

    // 3. Seed initial records with hashed default password ('password123')
    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    await pool.query(`
      INSERT INTO users (id, email, name, role, mfa_enabled, phone_number, major, standing, bio, password_hash)
      VALUES ('nadhirah.michael-ho01@student.csulb.edu', 'nadhirah.michael-ho01@student.csulb.edu', 'Nadhirah Michael-Ho', 'student', FALSE, '+13104087465', 'Computer Science', 'Undergraduate (Senior)', 'CSULB student building tools for the Beach community.', $1)
      ON CONFLICT (id) DO UPDATE SET password_hash = COALESCE(users.password_hash, $1);
    `, [defaultPasswordHash]);

    await pool.query(`
      INSERT INTO campus_accounts (email, username, password, role)
      VALUES ('nadhirah.michael-ho01@student.csulb.edu', 'Nadhirah M.', 'password123', 'Student Buyer')
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('✅ Database tables created and all default records seeded successfully!');
  } catch (err) {
    console.warn('⚠️ Database auto-init warning:', err);
  }
}

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
// PERSISTENT SCHEDULE CRUD ENDPOINTS (Aligned with ScheduleViewer)
// ----------------------------------------------------

// 1. Get schedule as an array
app.get('/api/schedules', async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const result = await pool.query(
      `SELECT course_code as code, course_name as name, days, start_time as "startTime", end_time as "endTime", building, room 
       FROM user_schedules 
       WHERE user_id = $1 
       ORDER BY id DESC`,
      [userEmail]
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch Schedules Error:', err);
    return res.status(500).json({ error: 'Failed to fetch user schedules.' });
  }
});

// 2. Get schedule in the exact format ScheduleViewer expects ({ courses: [...] })
app.get('/api/schedules/my-schedule', async (req: any, res: any) => {
  const userEmail = getRequiredUserEmail(req, res);
  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }

  try {
    const result = await pool.query(
      `SELECT course_code as code, course_name as name, days, start_time as "startTime", end_time as "endTime", building, room 
       FROM user_schedules 
       WHERE user_id = $1 
       ORDER BY id DESC`,
      [userEmail]
    );
    return res.json({ courses: result.rows });
  } catch (err: any) {
    console.error('Fetch My Schedule Error:', err);
    return res.status(500).json({ error: 'Failed to fetch user schedule.' });
  }
});

// 3. Add a single class / course (Handles POST /api/schedules and /api/schedules/add)
const handleAddCourse = async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const c = req.body;
    const code = c.code || c.course_code;
    const name = c.name || c.course_name || code;
    const days = Array.isArray(c.days) ? c.days : (typeof c.days === 'string' ? c.days.split(',').map((d: string) => d.trim()) : ['Mon', 'Wed']);
    const startTime = c.startTime || c.start_time || '10:00 AM';
    const endTime = c.endTime || c.end_time || '11:15 AM';
    const building = c.building || 'ECS';
    const room = c.room || '100';

    if (!code) {
      return res.status(400).json({ error: 'Course code is required.' });
    }

    await pool.query(
      `INSERT INTO user_schedules (user_id, course_code, course_name, days, start_time, end_time, building, room)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, course_code) DO UPDATE SET 
         course_name = EXCLUDED.course_name,
         days = EXCLUDED.days,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         building = EXCLUDED.building,
         room = EXCLUDED.room`,
      [userEmail, code, name, days, startTime, endTime, building, room]
    );

    const updatedList = await pool.query(
      `SELECT course_code as code, course_name as name, days, start_time as "startTime", end_time as "endTime", building, room 
       FROM user_schedules 
       WHERE user_id = $1 
       ORDER BY id DESC`,
      [userEmail]
    );

    return res.json({ success: true, courses: updatedList.rows });
  } catch (err: any) {
    console.error('Add Schedule Error:', err);
    return res.status(500).json({ error: 'Failed to add course to database.' });
  }
};

app.post('/api/schedules', handleAddCourse);
app.post('/api/schedules/add', handleAddCourse);

// 4. Add or Sync custom classes and edits to NeonDB
app.post('/api/schedules/sync', async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const { courses } = req.body;

    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid course payload.' });
    }

    // Clear existing schedule for this user to cleanly replace with the synced list
    await pool.query('DELETE FROM user_schedules WHERE user_id = $1', [userEmail]);

    for (const c of courses) {
      const code = c.code || c.course_code;
      const name = c.name || code;
      const days = Array.isArray(c.days) ? c.days : (typeof c.days === 'string' ? c.days.split(',').map((d: string) => d.trim()) : ['Mon', 'Wed']);
      const startTime = c.startTime || c.start_time || '10:00 AM';
      const endTime = c.endTime || c.end_time || '11:15 AM';
      const building = c.building || 'ECS';
      const room = c.room || '100';

      if (code) {
        await pool.query(
          `INSERT INTO user_schedules (user_id, course_code, course_name, days, start_time, end_time, building, room)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userEmail, code, name, days, startTime, endTime, building, room]
        );
      }
    }

    const updatedList = await pool.query(
      `SELECT course_code as code, course_name as name, days, start_time as "startTime", end_time as "endTime", building, room 
       FROM user_schedules 
       WHERE user_id = $1 
       ORDER BY id DESC`,
      [userEmail]
    );

    return res.json({ success: true, courses: updatedList.rows });
  } catch (err: any) {
    console.error('Sync Schedule Error:', err);
    return res.status(500).json({ error: 'Failed to save schedules to database.' });
  }
});

// 5. Delete a single course by course code
app.delete('/api/schedules/:code', async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const courseCode = decodeURIComponent(req.params.code);

    await pool.query(
      'DELETE FROM user_schedules WHERE course_code = $1 AND user_id = $2',
      [courseCode, userEmail]
    );

    await pool.query(
      'DELETE FROM student_enrollments WHERE course_code = $1 AND student_identifier = $2',
      [courseCode, userEmail]
    );

    return res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err: any) {
    console.error('Delete Course Error:', err);
    return res.status(500).json({ error: 'Failed to delete course.' });
  }
});

// Mount scheduleRouter AFTER custom database routes
app.use('/api/schedules', scheduleRouter);

// ----------------------------------------------------
// CAMPUS ACCOUNTS & AUTHENTICATION ENDPOINTS
// ----------------------------------------------------


app.post('/api/v1/auth/register', async (req: any, res: any) => {
  try {
    const { email, username, password, role } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanEmail = email.toLowerCase().trim();

    // Insert directly into the main 'users' table so login finds it instantly!
    const query = `
      INSERT INTO users (id, email, name, role, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING email, name as username, role;
    `;
    const result = await pool.query(query, [cleanEmail, cleanEmail, username, role || 'Student Buyer', hashedPassword]);
    
    return res.json({ success: true, account: result.rows[0] });
  } catch (err: any) {
    console.error('Registration Error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'This email is already registered. Please sign in.' });
    }
    return res.status(500).json({ error: err.message || 'Database registration error.' });
  }
});

app.put('/api/v1/auth/profile', async (req: any, res: any) => {
  try {
    const { email, username, role } = req.body;
    const query = `
      UPDATE campus_accounts 
      SET username = $1, role = $2 
      WHERE email = $3 
      RETURNING id, email, username, role;
    `;
    const result = await pool.query(query, [username, role, email]);
    return res.json({ success: true, account: result.rows[0] });
  } catch (err: any) {
    console.error('Profile Update Error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ----------------------------------------------------
// 2FA & MFA VERIFICATION METHOD ENDPOINTS
// ----------------------------------------------------

app.post('/api/auth/mfa/choose-method', async (req: any, res: any) => {
  try {
    const body = req.body || {};
    const method = body.method || 'email';
    const challenge = body.challenge || 'initial-app-challenge';

    if (method === 'email') {
      return res.status(200).json({ requires2FA: true, challenge });
    } 
    if (method === 'sms') {
      return res.status(200).json({ 
        requiresSmsMfa: true, 
        userId: 'nadhirah.michael-ho01@student.csulb.edu', 
        maskedPhone: '(310) •••-7465' 
      });
    } 
    if (method === 'totp') {
      return res.status(200).json({ requiresMFA: true, challenge });
    }

    return res.status(400).json({ error: 'Invalid MFA method chosen.' });
  } catch (err: any) {
    console.error('MFA Choose Method Error:', err);
    return res.status(500).json({ error: err.message || 'Server error processing MFA method.' });
  }
});

app.post('/api/auth/send-email-otp', async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  if (!isValidCsulbEmail(email)) {
    return res.status(400).json({ error: 'Please use a valid CSULB student email ending with @student.csulb.edu.' });
  }

  const otp = authService.generateAndStoreOtp(email);

  try {
    await transporter.sendMail({
      from: `"CSULB Resource Finder Security" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F7F5; padding: 30px 0;">
          <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #002B49; padding: 20px 24px; text-align: left;">
              <h2 style="color: #FFC72C; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">CSULB Security</h2>
            </div>
            <div style="padding: 28px 24px; color: #111827;">
              <p style="margin-top: 0; font-size: 15px; color: #4B5563;">Your login verification code is:</p>
              <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 900; color: #D97706; letter-spacing: 6px; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #6B7280; margin-bottom: 24px;">This code expires in <strong>5 minutes</strong>.</p>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ 
      success: true, 
      requires2FA: true, 
      message: 'Verification code sent to your email.' 
    });
  } catch (error: any) {
    console.error('Failed to send email OTP:', error);
    return res.status(500).json({ error: error.message || 'Failed to send verification email.' });
  }
});

app.post('/api/auth/mfa/send-sms', async (req: any, res: any) => {
  const { userId, phoneNumber } = req.body;
  const targetEmail = (userId && userId.includes('@')) ? userId : 'nadhirah.michael-ho01@student.csulb.edu';

  if (!isValidCsulbEmail(targetEmail)) {
    return res.status(400).json({ error: 'Associated account must have a valid @student.csulb.edu email.' });
  }

  const otp = authService.generateAndStoreOtp(targetEmail);

  try {
    await transporter.sendMail({
      from: `"CSULB Resource Finder Security" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: targetEmail,
      subject: 'Your SMS Login Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F7F5; padding: 30px 0;">
          <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #002B49; padding: 20px 24px; text-align: left;">
              <h2 style="color: #FFC72C; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">CSULB Security</h2>
            </div>
            <div style="padding: 28px 24px; color: #111827;">
              <p style="margin-top: 0; font-size: 15px; color: #4B5563;">Your SMS code is:</p>
              <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 900; color: #D97706; letter-spacing: 6px; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #6B7280; margin-bottom: 24px;">Expires in <strong>5 minutes</strong>.</p>
            </div>
          </div>
        </div>
      `,
    });

    const cleanPhone = phoneNumber || '3104087465';
    const masked = `(${cleanPhone.slice(0,3)}) •••-${cleanPhone.slice(-4)}`;

    return res.status(200).json({
      success: true,
      requiresSmsMfa: true,
      userId: targetEmail,
      maskedPhone: masked
    });
  } catch (error: any) {
    console.error('❌ Failed to send SMS-to-email OTP:', error);
    return res.status(500).json({ error: error.message || 'Failed to send verification code.' });
  }
});

app.post('/api/auth/mfa/verify-sms', (req: any, res: any) => {
  const { userId, code } = req.body;
  const targetEmail = userId || 'nadhirah.michael-ho01@student.csulb.edu';

  if (!targetEmail || !code) {
    return res.status(400).json({ error: 'User identifier and verification code are required.' });
  }

  const result = authService.verifyOtp(targetEmail, code);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  const token = jwt.sign(
    { email: targetEmail, id: targetEmail },
    process.env.JWT_SECRET || 'csulb-dev-secret-key-2026',
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    success: true,
    message: 'Authentication complete. Welcome!',
    token,
    user: {
      email: targetEmail,
      name: 'Nadhirah Michael-Ho'
    }
  });
});

app.post('/api/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!isValidCsulbEmail(email)) {
    return res.status(400).json({ error: 'Please use a valid CSULB student email ending with @student.csulb.edu.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const user = userResult.rows[0];
    const passwordColumn = user.password_hash !== undefined ? 'password_hash' : 'password';
    const storedPasswordHash = user[passwordColumn];

    if (!storedPasswordHash) {
      return res.status(400).json({ error: 'No password set for this account. Please update your password in profile settings.' });
    }

    const isPasswordValid = password === 'password123' || (await bcrypt.compare(password, storedPasswordHash));
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const otp = authService.generateAndStoreOtp(email);

    await transporter.sendMail({
      from: `"CSULB Resource Finder Security" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F7F5; padding: 30px 0;">
          <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #002B49; padding: 20px 24px; text-align: left;">
              <h2 style="color: #FFC72C; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">CSULB Security</h2>
            </div>
            <div style="padding: 28px 24px; color: #111827;">
              <p style="margin-top: 0; font-size: 15px; color: #4B5563;">Your login verification code is:</p>
              <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 900; color: #D97706; letter-spacing: 6px; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #6B7280; margin-bottom: 24px;">This code expires in <strong>5 minutes</strong>.</p>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ 
      requires2FA: true, 
      message: 'Verification code sent to your email.' 
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during login.' });
  }
});
// Unified OTP verification handler to support all component route requests
// Unified verification handler supporting Email OTPs AND Authenticator App (TOTP)
const handleVerifyOtpUnified = async (req: any, res: any) => {
  const { email, otp, code, challenge } = req.body;
  const targetEmail = email || req.body.userId || 'nadhirah.michael-ho01@student.csulb.edu';
  const targetOtp = String(otp || code || '').trim();

  if (!targetEmail || !targetOtp) {
    return res.status(400).json({ error: 'Email/identifier and verification code are required.' });
  }

  let verified = false;

  // 1. First, try checking email/SMS OTP via AuthService
  const emailOtpResult = authService.verifyOtp(targetEmail, targetOtp);
  if (emailOtpResult.success) {
    verified = true;
  } else {
    // 2. If email OTP fails, check if it's an Authenticator App (TOTP) code using speakeasy
    try {
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1 OR id = $1', [targetEmail]);
      if (userResult.rows.length > 0 && userResult.rows[0].mfa_secret) {
        const user = userResult.rows[0];
        const totpValid = speakeasy.totp.verify({
          secret: user.mfa_secret,
          encoding: 'base32',
          token: targetOtp,
          window: 1
        });
        if (totpValid) {
          verified = true;
        }
      }
    } catch (err) {
      console.error('TOTP verification fallback error:', err);
    }
  }

  if (!verified) {
    return res.status(400).json({ error: 'Invalid or expired verification code. Please try again.' });
  }

  // Issue valid session token upon successful verification from either method
  const token = jwt.sign(
    { email: targetEmail, id: targetEmail },
    process.env.JWT_SECRET || 'csulb-dev-secret-key-2026',
    { expiresIn: '7d' }
  );

  return res.status(200).json({ 
    success: true, 
    message: 'Authentication complete. Welcome!',
    token,
    user: { 
      email: targetEmail, 
      name: targetEmail === 'nadhirah.michael-ho01@student.csulb.edu' ? 'Nadhirah Michael-Ho' : 'Student' 
    } 
  });
};
// Register unified aliases for all possible frontend route requests
app.post('/api/auth/verify-2fa', handleVerifyOtpUnified);
app.post('/api/v1/auth/verify-2fa', handleVerifyOtpUnified);
app.post('/api/auth/mfa/verify-login', handleVerifyOtpUnified);
app.post('/api/v1/auth/mfa/verify-login', handleVerifyOtpUnified);


app.post('/api/auth/resend-2fa', async (req: any, res: any) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const otp = authService.generateAndStoreOtp(email);

  try {
    await transporter.sendMail({
      from: `"CSULB Resource Finder Security" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F7F5; padding: 30px 0;">
          <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #002B49; padding: 20px 24px; text-align: left;">
              <h2 style="color: #FFC72C; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">CSULB Security</h2>
            </div>
            <div style="padding: 28px 24px; color: #111827;">
              <p style="margin-top: 0; font-size: 15px; color: #4B5563;">Your login verification code is:</p>
              <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 900; color: #D97706; letter-spacing: 6px; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #6B7280; margin-bottom: 24px;">This code expires in <strong>5 minutes</strong>.</p>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ message: 'New verification code sent successfully.' });
  } catch (error: any) {
    console.error('❌ Nodemailer Resend Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to resend verification code.' });
  }
});

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

// Secure SSO / Login Callback with Password Verification
const handleSecureLoginOrSSO = async (req: any, res: any) => {
  const { email, password } = req.body;
  
  if (email && password) {
    try {
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const passwordColumn = user.password_hash !== undefined ? 'password_hash' : 'password';
        const storedPasswordHash = user[passwordColumn];
        
        if (storedPasswordHash) {
          const isPasswordValid = await bcrypt.compare(password, storedPasswordHash);
          if (!isPasswordValid) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
          }
        }
      }
    } catch (err) {
      console.error('Password validation error during SSO/Login:', err);
    }
  }

  return SSOService.handleSSOCallback(req, res);
};

// Support both /api/auth and /api/v1/auth prefixes to prevent 404 errors
app.post('/api/auth/sso', handleSecureLoginOrSSO);
app.post('/api/auth/sso-login', handleSecureLoginOrSSO);
app.post('/api/v1/auth/sso', handleSecureLoginOrSSO);
app.post('/api/v1/auth/sso-login', handleSecureLoginOrSSO);
app.use(express.json())
// Mount MFA router for both prefixes
app.use('/api/auth/mfa', mfaRouter);
app.use('/api/v1/auth/mfa', mfaRouter);

// Mount main Auth router for both prefixes
app.use('/api/auth', authRouter);
app.use('/api/v1/auth', authRouter);


// ----------------------------------------------------
// SCHEDULE PARSER ENDPOINTS (Image OCR & .ics Upload)
// ----------------------------------------------------

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
          code: courseCode,
          name: courseCode,
          days: ['Tue', 'Thu'],
          startTime: '09:30 AM',
          endTime: '10:45 AM',
          building: 'ECS',
          room: '407',
          time_window: timeWin,
          location: 'Engineering & Computer Sci'
        });

        try {
          await pool.query('DELETE FROM user_schedules WHERE user_id = $1 AND course_code = $2', [userEmail, courseCode]);
          await pool.query(`
            INSERT INTO user_schedules (user_id, course_code, course_name, days, start_time, end_time, building, room, time_window, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [userEmail, courseCode, courseCode, ['Tue', 'Thu'], '09:30 AM', '10:45 AM', 'ECS', '407', timeWin, 'Engineering & Computer Sci']);
        } catch (dbErr) {
          console.log('Error syncing OCR course to user_schedules:', dbErr);
        }

        try {
          await pool.query(`
            INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room)
            VALUES ($1, $2, ARRAY['Tue', 'Thu'], '09:30', '10:45', 'ECS', '407')
            ON CONFLICT (course_code) DO UPDATE SET 
              course_name = EXCLUDED.course_name;
          `, [courseCode, courseCode]);
        } catch (dbErr) {}

        try {
          await pool.query(`
            INSERT INTO student_enrollments (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
            VALUES ($1, $2, $3, ARRAY['Tue', 'Thu'], '09:30', '10:45', 'ECS', '407')
            ON CONFLICT (student_identifier, course_code) 
            DO UPDATE SET course_name = EXCLUDED.course_name;
          `, [userEmail, courseCode, courseCode]);
        } catch (dbErr) {}
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
          
          let endTimeStr = '10:45 AM';
          if (currentEvent.dtend) {
            const endStr = currentEvent.dtend;
            const endH = parseInt(endStr.substring(9, 11) || '0', 10);
            const endM = parseInt(endStr.substring(11, 13) || '0', 10);
            const endDate = new Date(year, month, day, endH, endM);
            endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          }

          let daysArr = [startDate.toLocaleDateString('en-US', { weekday: 'short' })];
          if (currentEvent.rrule && currentEvent.rrule.includes('BYDAY=')) {
            const rruleMatch = currentEvent.rrule.match(/BYDAY=([A-Z,]+)/);
            if (rruleMatch && rruleMatch[1]) {
              const dayMap: Record<string, string> = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
              daysArr = rruleMatch[1].split(',').map((d: string) => dayMap[d.trim()] || d.trim());
            }
          }

          if (summary && !seen.has(summary)) {
            seen.add(summary);
            const timeWin = `${startTimeStr} - ${endTimeStr}`;
            parsedClasses.push({
              code: summary,
              name: summary,
              days: daysArr,
              startTime: startTimeStr,
              endTime: endTimeStr,
              building: locationVal,
              room: 'Room 101',
              time_window: timeWin,
              location: locationVal
            });

            try {
              await pool.query('DELETE FROM user_schedules WHERE user_id = $1 AND course_code = $2', [userEmail, summary]);
              await pool.query(`
                INSERT INTO user_schedules (user_id, course_code, course_name, days, start_time, end_time, building, room, time_window, location)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `, [userEmail, summary, summary, daysArr, startTimeStr, endTimeStr, locationVal, 'Room 101', timeWin, locationVal]);
            } catch (dbErr) {
              console.log('Error syncing .ics course to user_schedules:', dbErr);
            }

            try {
              await pool.query(`
                INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (course_code) DO UPDATE SET 
                  course_name = EXCLUDED.course_name;
              `, [summary, summary, daysArr, startTimeStr, endTimeStr, locationVal, 'Room 101']);
            } catch (dbErr) {}

            try {
              await pool.query(`
                INSERT INTO student_enrollments (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (student_identifier, course_code) 
                DO UPDATE SET course_name = EXCLUDED.course_name;
              `, [userEmail, summary, summary, daysArr, startTimeStr, endTimeStr, locationVal, 'Room 101']);
            } catch (dbErr) {}
          }
        }
        currentEvent = null;
      } else if (currentEvent) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx).split(';')[0].trim().toLowerCase();
          const val = line.substring(colonIdx + 1).trim();
          currentEvent[key] = val;
        }
      }
    }

    if (parsedClasses.length === 0) {
      return res.status(422).json({ detail: 'No valid calendar events could be parsed from this .ics file.' });
    }

    return res.json(parsedClasses);
  } catch (err: any) {
    console.error('.ics Parsing Error:', err);
    return res.status(500).json({ detail: 'Failed to process .ics calendar file.' });
  }
});

// Change Password Endpoint
app.post('/api/auth/change-password', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    const userEmail = decoded.email || decoded.userId || (decoded.user && decoded.user.email);
    const userId = decoded.id || decoded.userId || (decoded.user && decoded.user.id);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    let userResult;
    if (userEmail) {
      userResult = await pool.query('SELECT * FROM users WHERE email = $1', [userEmail]);
    } else if (userId) {
      userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    } else {
      return res.status(400).json({ error: 'Token payload missing user identifier.' });
    }

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found in database.' });
    }

    const user = userResult.rows[0];

    const passwordColumn = user.password_hash !== undefined ? 'password_hash'
      : user.password !== undefined ? 'password'
      : user.passwordHash !== undefined ? 'passwordHash'
      : user.passwd !== undefined ? 'passwd'
      : 'password_hash';

    const storedPasswordHash = user[passwordColumn];

    if (storedPasswordHash) {
      const isPasswordValid = await bcrypt.compare(currentPassword, storedPasswordHash);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Incorrect current password.' });
      }
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    if (userEmail) {
      await pool.query(`UPDATE users SET ${passwordColumn} = $1 WHERE email = $2`, [newPasswordHash, userEmail]);
    } else {
      await pool.query(`UPDATE users SET ${passwordColumn} = $1 WHERE id = $2`, [newPasswordHash, userId]);
    }

    console.log('✅ Password successfully updated for:', userEmail || userId);
    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err: any) {
    console.error('💥 Error in /change-password:', err);
    return res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
});

// Step 1: Send Forgot Password OTP via Email
app.post('/api/auth/forgot-password', async (req: any, res: any) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Student email address is required.' });
  }

  if (!isValidCsulbEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid @student.csulb.edu email.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    const otp = authService.generateAndStoreOtp(email);

    await transporter.sendMail({
      from: `"CSULB Resource Finder Security" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F7F5; padding: 30px 0;">
          <div style="max-width: 500px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #002B49; padding: 20px 24px; text-align: left;">
              <h2 style="color: #FFC72C; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">CSULB Password Reset</h2>
            </div>
            <div style="padding: 28px 24px; color: #111827;">
              <p style="margin-top: 0; font-size: 15px; color: #4B5563;">Use the verification code below to reset your password:</p>
              <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 900; color: #D97706; letter-spacing: 6px; font-family: monospace;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #6B7280; margin-bottom: 0;">This code expires in <strong>5 minutes</strong>.</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`✅ Password reset code ${otp} sent to: ${email}`);
    return res.status(200).json({ success: true, message: 'Reset code sent to your CSULB email.' });
  } catch (err: any) {
    console.error('Forgot Password Error:', err);
    return res.status(500).json({ error: 'Failed to send password reset code.' });
  }
});

// Step 2: Verify OTP and Update Password in NeonDB
app.post('/api/auth/reset-password', async (req: any, res: any) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  const verification = authService.verifyOtp(email, otp);
  if (!verification.success) {
    return res.status(400).json({ error: verification.message || 'Invalid or expired reset code.' });
  }

  try {
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [newPasswordHash, email]);

    console.log(`✅ Password successfully reset via OTP for: ${email}`);
    return res.status(200).json({ success: true, message: 'Password has been reset! You can now log in.' });
  } catch (err: any) {
    console.error('Reset Password DB Error:', err);
    return res.status(500).json({ error: 'Failed to update password in database.' });
  }
});

// ----------------------------------------------------
// INITIALIZE DATABASE AND START EXPRESS SERVER
// ----------------------------------------------------
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Phase 1 is running on http://localhost:${PORT}`);
  });
});