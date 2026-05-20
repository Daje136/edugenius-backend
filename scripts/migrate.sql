-- ============================================================
-- EduGenius — Clean Slate Migration
-- Drops all existing tables and recreates them correctly
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop everything cleanly (order matters for foreign keys) ─
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments            CASCADE;
DROP TABLE IF EXISTS classes               CASCADE;
DROP TABLE IF EXISTS study_goals           CASCADE;
DROP TABLE IF EXISTS exam_sessions         CASCADE;
DROP TABLE IF EXISTS questions             CASCADE;
DROP TABLE IF EXISTS library_resources     CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;
DROP TABLE IF EXISTS schools               CASCADE;

-- Drop old enums if they exist
DROP TYPE IF EXISTS enum_users_role         CASCADE;
DROP TYPE IF EXISTS "enum_users_examTarget" CASCADE;
DROP TYPE IF EXISTS enum_users_curriculum   CASCADE;

-- ── Schools ───────────────────────────────────────────────────
CREATE TABLE schools (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(200) NOT NULL,
  country    VARCHAR(50)  DEFAULT 'Nigeria',
  curriculum VARCHAR(10)  DEFAULT 'NG'   CHECK (curriculum IN ('NG','UK','BOTH')),
  admin_id   UUID,
  is_active  BOOLEAN      DEFAULT true,
  plan_tier  VARCHAR(20)  DEFAULT 'free' CHECK (plan_tier IN ('free','standard','premium')),
  logo_url   VARCHAR(500),
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE users (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name             VARCHAR(50)  NOT NULL,
  last_name              VARCHAR(50)  NOT NULL,
  email                  VARCHAR(255) NOT NULL UNIQUE,
  password               VARCHAR(255) NOT NULL,
  role                   VARCHAR(20)  DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  is_active              BOOLEAN      DEFAULT true,
  is_email_verified      BOOLEAN      DEFAULT false,
  school_id              UUID         REFERENCES schools(id) ON DELETE SET NULL,
  class_level            VARCHAR(20),
  exam_target            VARCHAR(20)  CHECK (exam_target IN ('WAEC','JAMB','UK_GCSE','A_LEVEL','BOTH')),
  curriculum             VARCHAR(10)  DEFAULT 'NG' CHECK (curriculum IN ('NG','UK','BOTH')),
  streak_days            INTEGER      DEFAULT 0,
  last_active_at         TIMESTAMPTZ  DEFAULT NOW(),
  xp_points              INTEGER      DEFAULT 0,
  xp_level               INTEGER      DEFAULT 1,
  avatar_url             VARCHAR(500),
  refresh_token          TEXT,
  password_reset_token   VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_role      ON users(role);

-- ── Questions ─────────────────────────────────────────────────
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type       VARCHAR(20)  NOT NULL CHECK (exam_type IN ('WAEC','JAMB','UK_GCSE','A_LEVEL','PRIMARY','AI_GENERATED')),
  curriculum      VARCHAR(10)  DEFAULT 'NG',
  subject         VARCHAR(60)  NOT NULL,
  topic           VARCHAR(100),
  year            INTEGER,
  type            VARCHAR(20)  DEFAULT 'MCQ' CHECK (type IN ('MCQ','theory','fill_blank')),
  difficulty      INTEGER      DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  approved        BOOLEAN      DEFAULT false,
  is_ai_generated BOOLEAN      DEFAULT false,
  body            TEXT         NOT NULL,
  options         JSONB        DEFAULT '[]',
  answer_index    INTEGER,
  worked_solution TEXT,
  formulas_used   JSONB        DEFAULT '[]',
  common_mistakes TEXT,
  tags            JSONB        DEFAULT '[]',
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_questions_exam_type ON questions(exam_type);
CREATE INDEX idx_questions_subject   ON questions(subject);
CREATE INDEX idx_questions_approved  ON questions(approved);

-- ── Exam Sessions ─────────────────────────────────────────────
CREATE TABLE exam_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_type             VARCHAR(20) NOT NULL CHECK (exam_type IN ('WAEC','JAMB','UK_GCSE','A_LEVEL','PRIMARY','AI_GENERATED')),
  subject               VARCHAR(60) NOT NULL,
  topic                 VARCHAR(100),
  year                  INTEGER,
  total_questions       INTEGER     DEFAULT 0,
  answered              INTEGER     DEFAULT 0,
  correct               INTEGER     DEFAULT 0,
  score                 FLOAT,
  time_allotted_seconds INTEGER     DEFAULT 3600,
  time_spent_seconds    INTEGER     DEFAULT 0,
  status                VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','abandoned','timed_out')),
  answers_json          JSONB       DEFAULT '[]',
  weak_topics_detected  TEXT[]      DEFAULT '{}',
  xp_earned             INTEGER     DEFAULT 0,
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exam_sessions_user_id   ON exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_exam_type ON exam_sessions(exam_type, subject);
CREATE INDEX idx_exam_sessions_status    ON exam_sessions(status);

-- ── Study Goals ───────────────────────────────────────────────
CREATE TABLE study_goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_score    FLOAT       NOT NULL,
  exam_date       DATE        NOT NULL,
  weekly_hours    INTEGER     NOT NULL,
  exam_type       VARCHAR(20) NOT NULL CHECK (exam_type IN ('WAEC','JAMB','UK_GCSE','A_LEVEL')),
  target_subjects TEXT[]      DEFAULT '{}',
  weak_topics     TEXT[]      DEFAULT '{}',
  study_plan_json JSONB       DEFAULT '{}',
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_goals_user_id ON study_goals(user_id);

-- ── Classes ───────────────────────────────────────────────────
CREATE TABLE classes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  exam_type  VARCHAR(20) DEFAULT 'MIXED' CHECK (exam_type IN ('WAEC','JAMB','UK_GCSE','A_LEVEL','MIXED')),
  year       INTEGER     DEFAULT EXTRACT(YEAR FROM NOW()),
  is_active  BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_school_id  ON classes(school_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);

-- ── Assignments ───────────────────────────────────────────────
CREATE TABLE assignments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id   UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  class_id     UUID         NOT NULL REFERENCES classes(id)  ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  exam_type    VARCHAR(20)  DEFAULT 'MIXED' CHECK (exam_type IN ('WAEC','JAMB','UK_GCSE','A_LEVEL','MIXED')),
  subject      VARCHAR(60),
  question_ids TEXT[]       DEFAULT '{}',
  deadline     TIMESTAMPTZ  NOT NULL,
  ai_graded    BOOLEAN      DEFAULT true,
  max_score    INTEGER      DEFAULT 100,
  status       VARCHAR(20)  DEFAULT 'published' CHECK (status IN ('draft','published','closed')),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_class_id   ON assignments(class_id);
CREATE INDEX idx_assignments_deadline   ON assignments(deadline);

-- ── Assignment Submissions ────────────────────────────────────
CREATE TABLE assignment_submissions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id    UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  answers_json     JSONB       DEFAULT '[]',
  score            FLOAT,
  ai_feedback_json JSONB       DEFAULT '{}',
  teacher_feedback TEXT,
  teacher_score    FLOAT,
  status           VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','graded')),
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_submissions_student_id ON assignment_submissions(student_id);

-- ── Done ──────────────────────────────────────────────────────
SELECT 'Migration complete — all tables created successfully.' AS status;
