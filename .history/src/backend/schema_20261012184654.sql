-- Table for cached CSULB course catalog data
CREATE TABLE IF NOT EXISTS cached_courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    days VARCHAR(50)[] NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    building VARCHAR(50) NOT NULL,
    room VARCHAR(50) NOT NULL,
    semester VARCHAR(50) DEFAULT 'Fall 2026',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table mapping students to course codes
CREATE TABLE IF NOT EXISTS student_enrollments (
    student_identifier VARCHAR(255) NOT NULL, -- Student ID or Email
    course_code VARCHAR(50) NOT NULL,
    PRIMARY KEY (student_identifier, course_code)
);

-- Seed initial data for Nadhirah's account
-- Seed actual Fall 2026 courses for Nadhirah's account
INSERT INTO student_enrollments (student_identifier, course_code) VALUES
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 323'),
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 457'),
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 450'),
('nadhirah.michael-ho01@student.csulb.edu', 'CECS 491A'),
('s12345678', 'CECS 323'),
('s12345678', 'CECS 457'),
('s12345678', 'CECS 450'),
('s12345678', 'CECS 491A')
ON CONFLICT DO NOTHING;


