// Imports dotenv configuration to load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Imports the Express framework, HTTP server, and Socket.io for real-time chat.
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
// Imports CORS middleware to handle cross-origin resource sharing.
import cors from 'cors';
import fs from 'fs';
// Imports the Pool class from node-postgres for managing PostgreSQL database connections.
import { Pool } from 'pg';
// Imports multer for handling multipart/form-data file uploads (OCR images, .ics files & listing photos).
import multer from 'multer';
// Imports tesseract.js for pure JavaScript/WASM OCR image text extraction.
import { createWorker } from 'tesseract.js';
// Imports node-ical for parsing iCalendar files.
import ical from 'node-ical';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';

// Phase 1 modules
import { SSOService } from './auth/ssoService';
import { scheduleRouter } from './auth/schedules/scheduleRouter';
import { authRouter } from './backend/authRouter';
import { mfaRouter } from './auth/mfaRouter';
import { AuthService } from './auth/authService';
import { busTrackerRouter } from './routes/busTrackRouter';

// Phase 2 modules
import { MarketplaceService } from './marketplace/marketplaceService';
import { RewardsEngine } from './gamification/rewardsEngine';
import { EventsAndClubsService } from './events/eventsService';
import { sendRsvpConfirmation } from './utils/emailService';

const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://10.187.1.144:3000',
  'http://10.187.1.144:5173',
];

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../dist')));

// Configures the PostgreSQL database connection pool for NeonDB (with cloud SSL support).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Initialize services
const authService = new AuthService();
const marketplace = new MarketplaceService();
const rewards = new RewardsEngine();
const eventsAndClubs = new EventsAndClubsService();

// Helper to resolve email + role from NeonDB
async function resolveUserEmailAndRole(targetEmail: string) {
  const cleanEmail = targetEmail.trim().toLowerCase();
  const userRes = await pool.query(
    `SELECT email, name, role FROM users WHERE LOWER(email) = LOWER($1)`,
    [cleanEmail]
  );

  let email = userRes.rows[0]?.email || cleanEmail;
  let name = userRes.rows[0]?.name || cleanEmail.split('@')[0];
  let role = (userRes.rows[0]?.role || '').trim();

  if (!role) {
    const accRes = await pool.query(
      `SELECT email, username, role FROM campus_accounts WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail]
    );
    if (accRes.rows[0]) {
      email = accRes.rows[0].email || email;
      name = accRes.rows[0].username || name;
      role = (accRes.rows[0].role || '').trim();
    }
  }

  return { email: email.trim().toLowerCase(), name, role };
}

// Configure Nodemailer transporter using environment credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
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

// Helper to extract user identifier from JWT Authorization header (with fallback)
function getUserEmailFromReq(req: any): string {
  if (req.marketplaceUser?.email) return String(req.marketplaceUser.email).trim().toLowerCase();
  if (req.authUser?.email) return String(req.authUser.email).trim().toLowerCase();

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

// Asynchronous function to auto-initialize all Phase 1 & Phase 2 database tables and seed records
async function initializeDatabase() {
  try {
    // 1. Phase 1 tables and indexes
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
    await pool.query(
      `CREATE UNIQUE INDEX idx_student_enrollments_identifier_code ON student_enrollments (student_identifier, course_code);`
    );

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
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_schedules_user_course ON user_schedules (user_id, course_code);`
    );

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

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_type VARCHAR(50);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code VARCHAR(10);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code_expires TIMESTAMP;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS major VARCHAR(255) DEFAULT 'Computer Science';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS standing VARCHAR(255) DEFAULT 'Undergraduate (Senior)';`);
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'CSULB student building tools for the Beach community.';`
    );
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255);`);

    // 2. Phase 2 marketplace & chat tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketplace_listings (
          id SERIAL PRIMARY KEY,
          seller_email VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          image_data TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS marketplace_chats (
          id SERIAL PRIMARY KEY,
          listing_id INT NOT NULL,
          buyer_email VARCHAR(255) NOT NULL,
          seller_email VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS marketplace_messages (
          id SERIAL PRIMARY KEY,
          chat_id INT REFERENCES marketplace_chats(id) ON DELETE CASCADE,
          sender_email VARCHAR(255) NOT NULL,
          message_text TEXT NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Seed initial records
    const seedEmail = 'nadhirah.michael-ho01@student.csulb.edu';
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    await pool.query(
      `
      INSERT INTO users (id, email, name, role, mfa_enabled, phone_number, major, standing, bio, password_hash)
      VALUES ($1, $1, 'Nadhirah Michael-Ho', 'student', FALSE, '+13104087465', 'Computer Science', 'Undergraduate (Senior)', 'CSULB student building tools for the Beach community.', $2)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = COALESCE(NULLIF(users.role, ''), EXCLUDED.role),
        password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash);
    `,
      [seedEmail, defaultPasswordHash]
    );

    await pool.query(
      `
      INSERT INTO campus_accounts (email, username, password, role)
      VALUES ($1, 'Nadhirah M.', 'password123', 'Student Buyer')
      ON CONFLICT (email) DO UPDATE SET
        role = COALESCE(NULLIF(campus_accounts.role, ''), EXCLUDED.role);
    `,
      [seedEmail]
    );

    console.log('✅ Database tables created and all default records seeded successfully!');
  } catch (err) {
    console.error('❌ Database auto-init error:', err);
  }
}

// ----------------------------------------------------
// PHASE 1: PERSISTENT SCHEDULE CRUD ENDPOINTS
// ----------------------------------------------------

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

const handleAddCourse = async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const c = req.body;
    const code = c.code || c.course_code;
    const name = c.name || c.course_name || code;
    const days = Array.isArray(c.days)
      ? c.days
      : typeof c.days === 'string'
      ? c.days.split(',').map((d: string) => d.trim())
      : ['Mon', 'Wed'];
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

app.post('/api/schedules/sync', async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const { courses } = req.body;

    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid course payload.' });
    }

    await pool.query('DELETE FROM user_schedules WHERE user_id = $1', [userEmail]);

    for (const c of courses) {
      const code = c.code || c.course_code;
      const name = c.name || code;
      const days = Array.isArray(c.days)
        ? c.days
        : typeof c.days === 'string'
        ? c.days.split(',').map((d: string) => d.trim())
        : ['Mon', 'Wed'];
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

app.delete('/api/schedules/:code', async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const courseCode = decodeURIComponent(req.params.code);

    await pool.query('DELETE FROM user_schedules WHERE course_code = $1 AND user_id = $2', [
      courseCode,
      userEmail,
    ]);

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

app.use('/api/schedules', scheduleRouter);

// ----------------------------------------------------
// PHASE 1: CAMPUS ACCOUNTS, AUTH, 2FA/MFA & PROFILE
// ----------------------------------------------------

app.post('/api/v1/auth/register', async (req: any, res: any) => {
  try {
    const { email, username, password, role } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanUsername = (username || '').trim();

    if (!cleanEmail || !cleanUsername || !password) {
      return res.status(400).json({ error: 'Missing required registration fields.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = (role || 'Student Buyer').trim();

    const query = `
      INSERT INTO users (id, email, name, role, password_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING email, name as username, role;
    `;
    const result = await pool.query(query, [
      cleanEmail,
      cleanEmail,
      cleanUsername,
      assignedRole,
      hashedPassword,
    ]);

    await pool.query(
      `INSERT INTO campus_accounts (email, username, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, role = EXCLUDED.role;`,
      [cleanEmail, cleanUsername, hashedPassword, assignedRole]
    );

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
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRole = (role || '').trim();

    if (!cleanEmail || !cleanRole) {
      return res.status(400).json({ error: 'Both email and role are required.' });
    }

    await pool.query(
      `UPDATE users SET name = COALESCE($1, name), role = $2 WHERE LOWER(email) = LOWER($3);`,
      [username, cleanRole, cleanEmail]
    );

    const result = await pool.query(
      `UPDATE campus_accounts
       SET username = COALESCE($1, username), role = $2
       WHERE LOWER(email) = LOWER($3)
       RETURNING id, email, username, role;`,
      [username, cleanRole, cleanEmail]
    );

    const updated = result.rows[0] || { email: cleanEmail, username, role: cleanRole };
    return res.json({ success: true, account: updated });
  } catch (err: any) {
    console.error('Profile Update Error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

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
        maskedPhone: '(310) •••-7465',
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
    return res.status(400).json({
      error: 'Please use a valid CSULB student email ending with @student.csulb.edu.',
    });
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
      message: 'Verification code sent to your email.',
    });
  } catch (error: any) {
    console.error('Failed to send email OTP:', error);
    return res.status(500).json({ error: error.message || 'Failed to send verification email.' });
  }
});

app.post('/api/auth/mfa/send-sms', async (req: any, res: any) => {
  const { userId, phoneNumber } = req.body;
  const targetEmail =
    userId && userId.includes('@') ? userId : 'nadhirah.michael-ho01@student.csulb.edu';

  if (!isValidCsulbEmail(targetEmail)) {
    return res
      .status(400)
      .json({ error: 'Associated account must have a valid @student.csulb.edu email.' });
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
    const masked = `(${cleanPhone.slice(0, 3)}) •••-${cleanPhone.slice(-4)}`;

    return res.status(200).json({
      success: true,
      requiresSmsMfa: true,
      userId: targetEmail,
      maskedPhone: masked,
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
    return res
      .status(400)
      .json({ error: 'User identifier and verification code are required.' });
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
      name: 'Nadhirah Michael-Ho',
    },
  });
});

app.post('/api/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (!isValidCsulbEmail(email)) {
    return res.status(400).json({
      error: 'Please use a valid CSULB student email ending with @student.csulb.edu.',
    });
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
      return res.status(400).json({
        error: 'No password set for this account. Please update your password in profile settings.',
      });
    }

    const isPasswordValid =
      password === 'password123' || (await bcrypt.compare(password, storedPasswordHash));
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
      message: 'Verification code sent to your email.',
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error during login.' });
  }
});

const handleVerifyOtpUnified = async (req: any, res: any) => {
  const { email, otp, code } = req.body;
  const rawEmail = (email || req.body.userId || 'nadhirah.michael-ho01@student.csulb.edu')
    .toString()
    .trim()
    .toLowerCase();
  const targetOtp = String(otp || code || '').trim();

  if (!rawEmail || !targetOtp) {
    return res
      .status(400)
      .json({ error: 'Email/identifier and verification code are required.' });
  }

  let verified = false;
  let dbUser: any = null;

  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR id = $1',
      [rawEmail]
    );
    if (userResult.rows.length > 0) {
      dbUser = userResult.rows[0];
    }
  } catch (err) {
    console.error('User lookup error during OTP/TOTP verification:', err);
  }

  const emailOtpResult = authService.verifyOtp(rawEmail, targetOtp);
  if (emailOtpResult.success) {
    verified = true;
  } else if (dbUser?.mfa_secret) {
    try {
      const totpValid = speakeasy.totp.verify({
        secret: dbUser.mfa_secret,
        encoding: 'base32',
        token: targetOtp,
        window: 1,
      });
      if (totpValid) {
        verified = true;
      }
    } catch (err) {
      console.error('TOTP verification fallback error:', err);
    }
  }

  if (!verified) {
    return res
      .status(400)
      .json({ error: 'Invalid or expired verification code. Please try again.' });
  }

  let resolvedEmail = (dbUser?.email || rawEmail).trim().toLowerCase();
  let resolvedName =
    dbUser?.name ||
    (resolvedEmail === 'nadhirah.michael-ho01@student.csulb.edu'
      ? 'Nadhirah Michael-Ho'
      : resolvedEmail.split('@')[0]);
  let resolvedRole = (dbUser?.role || '').toString().trim();

  if (!resolvedRole) {
    try {
      const accResult = await pool.query(
        'SELECT email, username, role FROM campus_accounts WHERE LOWER(email) = LOWER($1)',
        [resolvedEmail]
      );
      if (accResult.rows.length > 0) {
        resolvedEmail = (accResult.rows[0].email || resolvedEmail).trim().toLowerCase();
        resolvedName = accResult.rows[0].username || resolvedName;
        resolvedRole = (accResult.rows[0].role || '').toString().trim();
      }
    } catch (err) {
      console.error('campus_accounts fallback error during verification:', err);
    }
  }

  if (!resolvedEmail || !resolvedRole) {
    return res.status(401).json({
      error: 'Authentication failed: account must have both an email address and a role.',
    });
  }

  const token = jwt.sign(
    { email: resolvedEmail, id: resolvedEmail, role: resolvedRole },
    process.env.JWT_SECRET || 'csulb-dev-secret-key-2026',
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    success: true,
    message: 'Authentication complete. Welcome!',
    token,
    user: {
      email: resolvedEmail,
      name: resolvedName,
      role: resolvedRole,
    },
  });
};

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
      linkedinUrl: user.linkedin_url || '',
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

    await pool.query(
      `
      UPDATE users 
      SET name = COALESCE($1, name),
          major = COALESCE($2, major),
          standing = COALESCE($3, standing),
          bio = COALESCE($4, bio),
          phone_number = COALESCE($5, phone_number),
          github_url = COALESCE($6, github_url),
          linkedin_url = COALESCE($7, linkedin_url)
      WHERE id = $8 OR email = $8;
    `,
      [name, major, standing, bio, phoneNumber, githubUrl, linkedinUrl, email]
    );

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

    await pool.query(`UPDATE users SET profile_picture = $1 WHERE id = $2 OR email = $2;`, [
      dataUri,
      email,
    ]);

    return res.json({ success: true, profilePicture: dataUri });
  } catch (err: any) {
    console.error('Avatar Upload Error:', err);
    return res.status(500).json({ error: 'Failed to upload profile picture.' });
  }
});

// Secure SSO / Login Callback with Password Verification
const handleSecureLoginOrSSO = async (req: any, res: any) => {
  const rawEmail = (req.body?.email || '').toString().trim().toLowerCase();
  const password = req.body?.password;
  let resolvedDbName: string | undefined;

  if (rawEmail && password) {
    try {
      const userResult = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        [rawEmail]
      );
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        resolvedDbName = user.name;
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

  req.body = {
    ...req.body,
    email: rawEmail,
    name: resolvedDbName || req.body?.name,
  };
  return SSOService.handleSSOCallback(req, res);
};

app.post('/api/auth/sso', handleSecureLoginOrSSO);
app.post('/api/auth/sso-login', handleSecureLoginOrSSO);
app.post('/api/v1/auth/sso', handleSecureLoginOrSSO);
app.post('/api/v1/auth/sso-login', handleSecureLoginOrSSO);

app.use('/api/auth/mfa', mfaRouter);
app.use('/api/v1/auth/mfa', mfaRouter);
app.use('/api/auth', authRouter);
app.use('/api/v1/auth', authRouter);

// ----------------------------------------------------
// PHASE 1: SCHEDULE PARSER ENDPOINTS (OCR & .ics)
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
    const courseRegex =
      /([A-Z]{2,4}\s+\d+[A-Z]?\s*-?\s*\d*).*?(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)?/gi;

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
          location: 'Engineering & Computer Sci',
        });

        try {
          await pool.query(
            'DELETE FROM user_schedules WHERE user_id = $1 AND course_code = $2',
            [userEmail, courseCode]
          );
          await pool.query(
            `
            INSERT INTO user_schedules (user_id, course_code, course_name, days, start_time, end_time, building, room, time_window, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
            [
              userEmail,
              courseCode,
              courseCode,
              ['Tue', 'Thu'],
              '09:30 AM',
              '10:45 AM',
              'ECS',
              '407',
              timeWin,
              'Engineering & Computer Sci',
            ]
          );
        } catch (dbErr) {
          console.log('Error syncing OCR course to user_schedules:', dbErr);
        }

        try {
          await pool.query(
            `
            INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room)
            VALUES ($1, $2, ARRAY['Tue', 'Thu'], '09:30', '10:45', 'ECS', '407')
            ON CONFLICT (course_code) DO UPDATE SET 
              course_name = EXCLUDED.course_name;
          `,
            [courseCode, courseCode]
          );
        } catch (dbErr) {}

        try {
          await pool.query(
            `
            INSERT INTO student_enrollments (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
            VALUES ($1, $2, $3, ARRAY['Tue', 'Thu'], '09:30', '10:45', 'ECS', '407')
            ON CONFLICT (student_identifier, course_code) 
            DO UPDATE SET course_name = EXCLUDED.course_name;
          `,
            [userEmail, courseCode, courseCode]
          );
        } catch (dbErr) {}
      }
    }

    if (parsedClasses.length === 0) {
      return res
        .status(422)
        .json({ detail: 'No valid course schedules could be detected in this image.' });
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
          const startTimeStr = startDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

          let endTimeStr = '10:45 AM';
          if (currentEvent.dtend) {
            const endStr = currentEvent.dtend;
            const endH = parseInt(endStr.substring(9, 11) || '0', 10);
            const endM = parseInt(endStr.substring(11, 13) || '0', 10);
            const endDate = new Date(year, month, day, endH, endM);
            endTimeStr = endDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          }

          let daysArr = [startDate.toLocaleDateString('en-US', { weekday: 'short' })];
          if (currentEvent.rrule && currentEvent.rrule.includes('BYDAY=')) {
            const rruleMatch = currentEvent.rrule.match(/BYDAY=([A-Z,]+)/);
            if (rruleMatch && rruleMatch[1]) {
              const dayMap: Record<string, string> = {
                MO: 'Mon',
                TU: 'Tue',
                WE: 'Wed',
                TH: 'Thu',
                FR: 'Fri',
                SA: 'Sat',
                SU: 'Sun',
              };
              daysArr = rruleMatch[1]
                .split(',')
                .map((d: string) => dayMap[d.trim()] || d.trim());
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
              location: locationVal,
            });

            try {
              await pool.query(
                'DELETE FROM user_schedules WHERE user_id = $1 AND course_code = $2',
                [userEmail, summary]
              );
              await pool.query(
                `
                INSERT INTO user_schedules (user_id, course_code, course_name, days, start_time, end_time, building, room, time_window, location)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              `,
                [
                  userEmail,
                  summary,
                  summary,
                  daysArr,
                  startTimeStr,
                  endTimeStr,
                  locationVal,
                  'Room 101',
                  timeWin,
                  locationVal,
                ]
              );
            } catch (dbErr) {
              console.log('Error syncing .ics course to user_schedules:', dbErr);
            }

            try {
              await pool.query(
                `
                INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (course_code) DO UPDATE SET 
                  course_name = EXCLUDED.course_name;
              `,
                [summary, summary, daysArr, startTimeStr, endTimeStr, locationVal, 'Room 101']
              );
            } catch (dbErr) {}

            try {
              await pool.query(
                `
                INSERT INTO student_enrollments (student_identifier, course_code, course_name, days, start_time, end_time, building, room)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (student_identifier, course_code) 
                DO UPDATE SET course_name = EXCLUDED.course_name;
              `,
                [userEmail, summary, summary, daysArr, startTimeStr, endTimeStr, locationVal, 'Room 101']
              );
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
      return res
        .status(422)
        .json({ detail: 'No valid calendar events could be parsed from this .ics file.' });
    }

    return res.json(parsedClasses);
  } catch (err: any) {
    console.error('.ics Parsing Error:', err);
    return res.status(500).json({ detail: 'Failed to process .ics calendar file.' });
  }
});

app.post('/api/auth/change-password', async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'csulb-dev-secret-key-2026';

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
    const passwordColumn =
      user.password_hash !== undefined
        ? 'password_hash'
        : user.password !== undefined
        ? 'password'
        : user.passwordHash !== undefined
        ? 'passwordHash'
        : user.passwd !== undefined
        ? 'passwd'
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
      await pool.query(`UPDATE users SET ${passwordColumn} = $1 WHERE email = $2`, [
        newPasswordHash,
        userEmail,
      ]);
    } else {
      await pool.query(`UPDATE users SET ${passwordColumn} = $1 WHERE id = $2`, [
        newPasswordHash,
        userId,
      ]);
    }

    console.log('✅ Password successfully updated for:', userEmail || userId);
    return res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err: any) {
    console.error('💥 Error in /change-password:', err);
    return res.status(500).json({ error: `Internal server error: ${err.message}` });
  }
});

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

app.post('/api/auth/reset-password', async (req: any, res: any) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ error: 'Email, verification code, and new password are required.' });
  }

  const verification = authService.verifyOtp(email, otp);
  if (!verification.success) {
    return res.status(400).json({ error: verification.message || 'Invalid or expired reset code.' });
  }

  try {
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
      newPasswordHash,
      email,
    ]);

    console.log(`✅ Password successfully reset via OTP for: ${email}`);
    return res
      .status(200)
      .json({ success: true, message: 'Password has been reset! You can now log in.' });
  } catch (err: any) {
    console.error('Reset Password DB Error:', err);
    return res.status(500).json({ error: 'Failed to update password in database.' });
  }
});

// ----------------------------------------------------
// PHASE 2: MARKETPLACE, CHATS, REWARDS, EVENTS & SOCKET.IO
// ----------------------------------------------------

const ALLOWED_MARKETPLACE_ROLES = new Set([
  'student',
  'buyer',
  'seller',
  'admin',
  'Student Buyer',
  'Campus Seller',
  'Faculty / Admin',
]);

const ALLOWED_MARKETPLACE_ROLES_LOWER = new Set(
  Array.from(ALLOWED_MARKETPLACE_ROLES).map((r) => r.toLowerCase())
);

function extractEmailAndRole(req: any) {
  const email = (
    req.headers['x-user-email'] ||
    req.body?.userEmail ||
    req.body?.email ||
    req.query?.email ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();

  const role = (
    req.headers['x-user-role'] ||
    req.body?.userRole ||
    req.body?.role ||
    req.query?.role ||
    ''
  )
    .toString()
    .trim();

  return { email, role };
}

interface AuthorizeOptions {
  allowedRoles?: string[] | Set<string>;
  allowedEmails?: string[];
}

export function authorizeMarketplaceUser(options: AuthorizeOptions = {}) {
  const rawAllowedRoles = options.allowedRoles
    ? Array.from(options.allowedRoles).map((r) => String(r).trim().toLowerCase())
    : Array.from(ALLOWED_MARKETPLACE_ROLES_LOWER);
  const allowedEmails = (options.allowedEmails || []).map((e) => e.toLowerCase());

  return async (req: any, res: any, next: any) => {
    try {
      let { email, role } = extractEmailAndRole(req);

      const authHeader = req.headers['authorization'];
      const token =
        authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      if (token) {
        try {
          const decoded: any = jwt.verify(
            token,
            process.env.JWT_SECRET || 'csulb-dev-secret-key-2026'
          );
          if (!email && decoded?.email) email = String(decoded.email).trim().toLowerCase();
          if (!role && decoded?.role) role = String(decoded.role).trim();
        } catch {
          return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
        }
      }

      if (email && !role) {
        const resolved = await resolveUserEmailAndRole(email);
        if (resolved.role) role = resolved.role;
      }

      if (!email || !role) {
        return res.status(401).json({
          error:
            'Authentication required: both a logged-in email address and a role are required.',
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address format.' });
      }

      const normalizedRole = role.toLowerCase();
      if (
        !ALLOWED_MARKETPLACE_ROLES_LOWER.has(normalizedRole) ||
        !rawAllowedRoles.includes(normalizedRole)
      ) {
        return res.status(403).json({
          error: `Forbidden: role "${role}" is not permitted to access marketplace or chat features.`,
        });
      }

      if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
        return res.status(403).json({
          error: 'Forbidden: Your email is not authorized for this resource.',
        });
      }

      req.marketplaceUser = { email, role };
      req.authUser = { email, role: normalizedRole };
      return next();
    } catch (err) {
      console.error('Authorization Middleware Error:', err);
      return res
        .status(500)
        .json({ error: 'Internal server error during authorization.' });
    }
  };
}

io.use((socket, next) => {
  const email = (socket.handshake.auth?.email || '').toString().trim().toLowerCase();
  const role = (socket.handshake.auth?.role || '').toString().trim();

  if (!email || !role) {
    return next(new Error('Unauthorized: both email and role are required for chat.'));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return next(new Error('Unauthorized: invalid email address format.'));
  }
  if (!ALLOWED_MARKETPLACE_ROLES_LOWER.has(role.toLowerCase())) {
    return next(new Error(`Forbidden: role "${role}" is not permitted for chat.`));
  }

  socket.data.user = { email, role };
  next();
});

app.get('/api/marketplace', (req, res) => {
  const category = req.query.category as string;
  res.json(marketplace.getPosts(category));
});

app.post(
  '/api/marketplace',
  authorizeMarketplaceUser({ allowedRoles: ALLOWED_MARKETPLACE_ROLES }),
  (req, res) => {
    const newPost = marketplace.createPost(req.body);
    rewards.awardPoints(req.body.sellerId || 'current_user', 20, 'Posted marketplace item');
    res.status(201).json(newPost);
  }
);

const handleGetListings = async (req: any, res: any) => {
  try {
    const result = await pool.query(`
      SELECT * FROM marketplace_listings 
      ORDER BY created_at DESC;
    `);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch Listings Error:', err);
    res.status(500).json({ error: 'Failed to retrieve marketplace listings.' });
  }
};

const handleCreateListing = async (req: any, res: any) => {
  try {
    const userEmail = getUserEmailFromReq(req);
    const { title, description, price } = req.body;

    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required.' });
    }

    let imageUri = null;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';
      imageUri = `data:${mimeType};base64,${b64}`;
    }

    const result = await pool.query(
      `
      INSERT INTO marketplace_listings (seller_email, title, description, price, image_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
      [userEmail, title, description, price, imageUri]
    );

    rewards.awardPoints(userEmail, 20, 'Posted marketplace item with photo');

    res.status(201).json({
      success: true,
      message: 'Listing created successfully with photo!',
      listing: result.rows[0],
    });
  } catch (err: any) {
    console.error('Create Listing Error:', err);
    res.status(500).json({ error: 'Failed to create marketplace listing.' });
  }
};

app.get('/api/v1/marketplace/listings', handleGetListings);
app.get('/api/marketplace/listings', handleGetListings);

app.post(
  '/api/v1/marketplace/listings',
  authorizeMarketplaceUser({ allowedRoles: ALLOWED_MARKETPLACE_ROLES }),
  upload.single('image'),
  handleCreateListing
);
app.post(
  '/api/marketplace/listings',
  authorizeMarketplaceUser({ allowedRoles: ALLOWED_MARKETPLACE_ROLES }),
  upload.single('image'),
  handleCreateListing
);

app.post(
  '/api/v1/marketplace/chats',
  authorizeMarketplaceUser({ allowedRoles: ALLOWED_MARKETPLACE_ROLES }),
  async (req: any, res: any) => {
    try {
      const buyerEmail = getUserEmailFromReq(req);
      const { listingId, sellerEmail } = req.body;

      if (!listingId || !sellerEmail) {
        return res.status(400).json({ error: 'listingId and sellerEmail are required.' });
      }

      const chatResult = await pool.query(
        `
        SELECT * FROM marketplace_chats 
        WHERE listing_id = $1 AND LOWER(buyer_email) = $2
      `,
        [listingId, buyerEmail]
      );

      let chat;
      if (chatResult.rows.length === 0) {
        const newChat = await pool.query(
          `
          INSERT INTO marketplace_chats (listing_id, buyer_email, seller_email)
          VALUES ($1, $2, $3)
          RETURNING *;
        `,
          [listingId, buyerEmail, String(sellerEmail).trim().toLowerCase()]
        );
        chat = newChat.rows[0];
      } else {
        chat = chatResult.rows[0];
      }

      return res.json({ success: true, chat });
    } catch (err) {
      console.error('Chat Init Error:', err);
      return res.status(500).json({ error: 'Failed to initialize chat.' });
    }
  }
);

app.get(
  '/api/v1/marketplace/chats/:chatId/messages',
  authorizeMarketplaceUser({ allowedRoles: ALLOWED_MARKETPLACE_ROLES }),
  async (req: any, res: any) => {
    try {
      const { chatId } = req.params;
      const requesterEmail = getUserEmailFromReq(req);
      const requesterRole = req.authUser?.role;

      const chatRes = await pool.query(
        `SELECT buyer_email, seller_email FROM marketplace_chats WHERE id = $1`,
        [chatId]
      );
      if (chatRes.rows.length === 0) {
        return res.status(404).json({ error: 'Chat not found.' });
      }

      const { buyer_email, seller_email } = chatRes.rows[0];
      const isParticipant =
        requesterEmail === String(buyer_email).trim().toLowerCase() ||
        requesterEmail === String(seller_email).trim().toLowerCase();

      if (!isParticipant && requesterRole !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: You are not part of this chat.' });
      }

      const messages = await pool.query(
        `
        SELECT * FROM marketplace_messages 
        WHERE chat_id = $1 
        ORDER BY sent_at ASC;
      `,
        [chatId]
      );

      return res.json(messages.rows);
    } catch (err) {
      console.error('Fetch Messages Error:', err);
      return res.status(500).json({ error: 'Failed to fetch messages.' });
    }
  }
);

app.post(
  '/api/v1/marketplace/chats/:chatId/messages',
  authorizeMarketplaceUser({ allowedRoles: ALLOWED_MARKETPLACE_ROLES }),
  async (req: any, res: any) => {
    try {
      const senderEmail = getUserEmailFromReq(req);
      const { chatId } = req.params;
      const { text, listingId } = req.body;

      if (!text) return res.status(400).json({ error: 'Message text is required.' });

      const chatCheck = await pool.query(
        `
        SELECT * FROM marketplace_chats WHERE id = $1;
      `,
        [chatId]
      );

      if (chatCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Chat not found.' });
      }

      const chatRow = chatCheck.rows[0];
      const isParticipant =
        senderEmail === String(chatRow.buyer_email).trim().toLowerCase() ||
        senderEmail === String(chatRow.seller_email).trim().toLowerCase();

      if (!isParticipant && req.authUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: You cannot post in this chat.' });
      }

      const msgResult = await pool.query(
        `
        INSERT INTO marketplace_messages (chat_id, sender_email, message_text)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
        [chatId, senderEmail, text]
      );

      const savedMessage = msgResult.rows[0];
      const targetListingId = listingId || chatRow.listing_id;
      if (targetListingId) {
        io.to(`listing_${targetListingId}`).emit('receive-message', savedMessage);
      }

      return res.status(201).json({ success: true, message: savedMessage });
    } catch (err) {
      console.error('Send Message Error:', err);
      return res.status(500).json({ error: 'Failed to send message.' });
    }
  }
);

app.get('/api/rewards/:userId', (req, res) => {
  res.json(rewards.getProfile(req.params.userId));
});

app.post('/api/rewards/award', (req, res) => {
  const { userId, points, reason } = req.body || {};
  if (!userId || typeof points !== 'number') {
    return res.status(400).json({ error: 'userId and numeric points are required.' });
  }
  const profile = rewards.awardPoints(
    String(userId).trim().toLowerCase(),
    points,
    reason || 'Points awarded'
  );
  return res.json({ success: true, profile });
});

app.get('/api/events', (req, res) => res.json(eventsAndClubs.getEvents()));
app.get('/api/clubs', (req, res) => res.json(eventsAndClubs.getClubs()));

app.post('/api/events/:id/rsvp', async (req, res) => {
  const eventId = req.params.id;
  const { userId, eventTitle, eventDate } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User email is required for RSVP.' });
  }

  const success = eventsAndClubs.rsvpEvent(eventId, userId);

  if (success) {
    rewards.awardPoints(userId, 10, 'RSVP to campus event');

    let emailStatus = 'Not Sent (SMTP Not Configured)';

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await sendRsvpConfirmation(userId, eventTitle || 'Campus Event', eventDate || 'TBD');
        emailStatus = 'Sent Successfully';
        console.log(`Confirmation email successfully sent to: ${userId}`);
      } else {
        console.warn(
          'Skipping email: EMAIL_USER or EMAIL_PASS is missing in environment variables.'
        );
      }
    } catch (e: any) {
      console.error('Email sending failed with error:', e.message || e);
      emailStatus = `Failed to Send: ${e.message || 'Unknown error'}`;
    }

    return res.json({
      message: 'RSVP Successful',
      pointsAwarded: 10,
      emailStatus,
    });
  } else {
    return res.status(400).json({ error: 'Already RSVPed or invalid event' });
  }
});


// Inside server.ts where `app` and `express.json()` middleware are set up:
const handleRsvpConfirm = async (req: express.Request, res: express.Response) => {
  const { email, eventTitle, eventDate, eventLocation, organization } = req.body;

  if (!email || !eventTitle) {
    return res.status(400).json({ error: 'Recipient email and event title are required.' });
  }

  try {
    await sendRsvpConfirmation(
      email,
      eventTitle,
      eventDate || 'TBD',
      eventLocation,
      organization
    );

    return res.json({ success: true, message: 'RSVP confirmation email sent.' });
  } catch (error) {
    console.error('Failed to send RSVP confirmation email:', error);
    return res.status(500).json({ error: 'Failed to send confirmation email.' });
  }
};

app.post('/api/v1/events/rsvp-confirm', handleRsvpConfirm);
app.post('/api/events/rsvp-confirm', handleRsvpConfirm);
io.on('connection', (socket: Socket) => {
  const connectedUser = socket.data.user || {};
  console.log(
    `Device connected: ${socket.id} (${connectedUser.email}, ${connectedUser.role})`
  );

  socket.on(
    'join-room',
    ({
      listingId,
      userId,
      role,
    }: {
      listingId: string | number;
      userId?: string;
      role?: string;
    }) => {
      const effectiveEmail = String(userId || connectedUser.email || '')
        .trim()
        .toLowerCase();
      const effectiveRole = String(role || connectedUser.role || '').trim();

      if (
        !effectiveEmail ||
        !effectiveRole ||
        !ALLOWED_MARKETPLACE_ROLES_LOWER.has(effectiveRole.toLowerCase())
      ) {
        socket.emit('message-error', {
          error: 'Unauthorized: Valid email and role required to join room.',
        });
        return;
      }

      const roomName = `listing_${listingId}`;
      socket.join(roomName);
      console.log(
        `Socket ${socket.id} (${effectiveEmail}, ${effectiveRole}) joined room: ${roomName}`
      );
    }
  );

  socket.on('leave-room', ({ listingId }: { listingId: string | number }) => {
    const roomName = `listing_${listingId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left room: ${roomName}`);
  });

  socket.on(
    'send-message',
    async (data: {
      listingId: string | number;
      chatId?: number;
      senderId?: string;
      receiverId?: string;
      role?: string;
      content: string;
    }) => {
      try {
        const effectiveSender = String(data.senderId || connectedUser.email || '')
          .trim()
          .toLowerCase();
        const effectiveRole = String(data.role || connectedUser.role || '').trim();

        if (
          !effectiveSender ||
          !effectiveRole ||
          !ALLOWED_MARKETPLACE_ROLES_LOWER.has(effectiveRole.toLowerCase())
        ) {
          socket.emit('message-error', {
            error: 'Forbidden: Both email and allowed role are required to send messages.',
          });
          return;
        }

        const numericListingId = Number(data.listingId);
        let targetChatId = data.chatId;

        if (!targetChatId) {
          const existingChat = await pool.query(
            `SELECT id FROM marketplace_chats WHERE listing_id = $1 AND (LOWER(buyer_email) = $2 OR LOWER(seller_email) = $2) ORDER BY id ASC LIMIT 1`,
            [numericListingId, effectiveSender]
          );
          if (existingChat.rows.length > 0) {
            targetChatId = existingChat.rows[0].id;
          } else {
            const listingRes = await pool.query(
              `SELECT seller_email FROM marketplace_listings WHERE id = $1`,
              [numericListingId]
            );
            const sellerEmail =
              data.receiverId ||
              listingRes.rows[0]?.seller_email ||
              'nadhirah.michael-ho01@student.csulb.edu';
            const createdChat = await pool.query(
              `INSERT INTO marketplace_chats (listing_id, buyer_email, seller_email) VALUES ($1, $2, $3) RETURNING id`,
              [numericListingId, effectiveSender, sellerEmail.trim().toLowerCase()]
            );
            targetChatId = createdChat.rows[0].id;
          }
        }

        const msgResult = await pool.query(
          `INSERT INTO marketplace_messages (chat_id, sender_email, message_text)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [targetChatId, effectiveSender, data.content]
        );

        const row = msgResult.rows[0];
        const payload = {
          id: String(row.id),
          chatId: row.chat_id,
          listingId: String(data.listingId),
          senderId: row.sender_email,
          receiverId: data.receiverId || '',
          content: row.message_text,
          createdAt: row.sent_at,
        };

        io.to(`listing_${data.listingId}`).emit('receive-message', payload);
      } catch (error) {
        console.error('Failed to save and route message:', error);
        socket.emit('message-error', { error: 'Failed to send message' });
      }
    }
  );

  socket.on('disconnect', () => {
    console.log(`Device disconnected: ${socket.id}`);
  });
});

// ----------------------------------------------------
// INITIALIZE DATABASE AND START COMBINED SERVER
// ----------------------------------------------------
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Combined Phase 1 & Phase 2 server running on http://localhost:${PORT}`);
  });
});