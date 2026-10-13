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