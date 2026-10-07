# School Database Design

## Tables

### students
Stores one row per student. It has `student_id` (primary key), `name` and `email`. The email is `UNIQUE` so two students cannot share the same address, and both `name` and `email` are `NOT NULL` because every student needs them.

### courses
Stores one row per course. It has `course_id` (primary key), `title` and `credits`, all required. A course exists whether or not anyone is enrolled on it.

### enrolments
Stores one row for each time a student is enrolled on a course. It has `enrolment_id` (primary key), `student_id` and `course_id` (both foreign keys, both `NOT NULL`), and `grade`. The grade is allowed to be `NULL` because a student has no grade until they are marked. A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **students to enrolments: one-to-many.** One student can have many enrolments, but each enrolment belongs to exactly one student.
- **courses to enrolments: one-to-many.** One course can have many enrolments, but each enrolment belongs to exactly one course.
- **students to courses: many-to-many.** A student can take many courses, and a course has many students.

### Why a join table is needed

A relational table cannot store a list in one cell. Putting several course ids inside a student row (or several student ids inside a course row) would break the rules of good table design, make searching and counting awkward, and make it easy to create inconsistent data. The `enrolments` table solves this by turning one many-to-many relationship into two one-to-many relationships. It also gives a natural home to information about the link itself, the grade, which belongs to neither the student nor the course alone.

## Index

I would add an index on the course column of the enrolments table:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);
```

**Reason:** the queries that list the students on a course and count students per course both look up enrolments by `course_id`. The `UNIQUE (student_id, course_id)` rule already creates an index that starts with `student_id`, so lookups by student are fast, but lookups by course alone would still have to scan the whole table as it grows. This index makes them fast.

## SQL or NoSQL?

I would choose SQL for this system. The data is structured and consistent (every student, course and enrolment has the same fields), and the relationships between them matter: the system needs to join tables to answer questions such as which students are on a course or how many students each course has. A relational database also enforces the rules directly, for example unique emails, valid foreign keys and no duplicate enrolments, so the data stays correct without extra application code. A NoSQL database would suit data that is loosely structured or needs to scale across many servers, but a school's records do not need that, and it would make joins and consistency harder.
