-- School database: students, courses and enrolments
-- Runs in SQLite (e.g. sqliteonline.com)

PRAGMA foreign_keys = ON;

-- Remove old tables so the file can be re-run (children first)
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ---------- Tables ----------

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    credits   INTEGER NOT NULL
);

-- Join table: one row = one student enrolled on one course
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL,
    course_id    INTEGER NOT NULL,
    grade        INTEGER CHECK (grade BETWEEN 0 AND 100),  -- NULL until graded
    FOREIGN KEY (student_id) REFERENCES students (student_id),
    FOREIGN KEY (course_id)  REFERENCES courses (course_id),
    UNIQUE (student_id, course_id)  -- same student cannot join the same course twice
);

-- ---------- Sample data ----------

INSERT INTO students (student_id, name, email) VALUES
    (1, 'Amina Wanjiru',  'amina@example.com'),
    (2, 'Brian Otieno',   'brian@example.com'),
    (3, 'Cynthia Mwangi', 'cynthia@example.com'),
    (4, 'David Kamau',    'david@example.com');

INSERT INTO courses (course_id, title, credits) VALUES
    (1, 'Web Foundations',  3),
    (2, 'Databases',        4),
    (3, 'JavaScript Basics', 3);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 1, 78),
    (1, 2, 91),
    (2, 1, 64),
    (2, 2, NULL),
    (3, 2, 85),
    (3, 3, 72);

-- ---------- Queries ----------

-- Query 1: all courses for one student (by name)
SELECT c.title, c.credits, e.grade
FROM students s
JOIN enrolments e ON e.student_id = s.student_id
JOIN courses c    ON c.course_id  = e.course_id
WHERE s.name = 'Amina Wanjiru';

-- Query 2: all students on one course
SELECT s.name, s.email, e.grade
FROM courses c
JOIN enrolments e ON e.course_id  = c.course_id
JOIN students s   ON s.student_id = e.student_id
WHERE c.title = 'Databases';

-- Query 3: number of students per course
SELECT c.title, COUNT(e.enrolment_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.title;

-- Query 4: students who have no enrolments
SELECT s.name, s.email
FROM students s
LEFT JOIN enrolments e ON e.student_id = s.student_id
WHERE e.enrolment_id IS NULL;

-- Query 5: update one enrolment's grade (Brian's grade for Databases)
UPDATE enrolments
SET grade = 82
WHERE student_id = (SELECT student_id FROM students WHERE name = 'Brian Otieno')
  AND course_id  = (SELECT course_id  FROM courses  WHERE title = 'Databases');

-- Check the update worked
SELECT s.name, c.title, e.grade
FROM enrolments e
JOIN students s ON s.student_id = e.student_id
JOIN courses c  ON c.course_id  = e.course_id
WHERE s.name = 'Brian Otieno';
