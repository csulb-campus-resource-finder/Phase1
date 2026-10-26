-- 1. Clear old data to prevent stale mappings
DELETE FROM student_enrollments;
DELETE FROM cached_courses;

-- 2. Insert your actual Fall 2026 course catalog cache
INSERT INTO cached_courses (course_code, course_name, days, start_time, end_time, building, room, semester) VALUES
('CECS 323', 'Database Fundamentals', ARRAY['Tue', 'Thu'], '09:30', '10:45', 'ECS', '311', 'Fall 2026'),
('CECS 457', 'Applied Machine Learning', ARRAY['Mon', 'Wed'], '11:00', '12:15', 'VEC', '115', 'Fall 2026'),
('CECS 450', 'Data Visualization', ARRAY['Tue', 'Thu'], '12:30', '13:45', 'ECS', '412', 'Fall 2026'),
('CECS 491A', 'Computer Science Senior Project I', ARRAY['Mon', 'Wed'], '14:00', '15:15', 'ECS', '304', 'Fall 2026');

-- 3. Map your student account to your actual Fall 2026 courses
INSERT INTO student_enrollments (student_identifier, course_code) VALUES
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 323'),
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 457'),
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 450'),
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 491A'),
('s12345678', 'CECS 323'),
('s12345678', 'CECS 457'),
('s12345678', 'CECS 450'),
('s12345678', 'CECS 491A');

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_type VARCHAR(20) DEFAULT 'totp';

-- Ensure users table supports dual MFA types and Twilio SMS verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_type VARCHAR(20) DEFAULT 'totp';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_code_expires TIMESTAMP;

CREATE TABLE IF NOT EXISTS user_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_code TEXT NOT NULL,
    time_window TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_schedules_user_id ON user_schedules(user_id);
