'use strict';
require('dotenv').config();
const { Pool }  = require('pg');
const bcrypt    = require('bcryptjs');
const logger    = require('../src/utils/logger');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'edugenius',
  user:     process.env.PG_USER     || 'edugenius_user',
  password: process.env.PG_PASSWORD,
  ssl:      process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  logger.info('PostgreSQL connected for seeding');

  try {
    await client.query('BEGIN');

    // ── 1. Seed School ───────────────────────────────────────
    let schoolId;
    const existingSchool = await client.query(
      `SELECT id FROM schools WHERE name = $1 LIMIT 1`,
      ['EduGenius']
    );

    if (existingSchool.rows.length > 0) {
      schoolId = existingSchool.rows[0].id;
      logger.info(`School already exists: ${schoolId}`);
    } else {
      const schoolRes = await client.query(`
        INSERT INTO schools (name, country, curriculum, plan_tier)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['EduGenius', 'Nigeria', 'NG', 'premium']);
      schoolId = schoolRes.rows[0].id;
      logger.info(`School created: ${schoolId}`);
    }

    // ── 2. Seed Users ────────────────────────────────────────
    const users = [
      {
        first_name: 'Admin',   last_name: 'EduGenius',
        email: 'admin@edugenius.ng',   password: 'Admin@12345',
        role: 'admin',   class_level: null, exam_target: null,
        streak_days: 0,  xp_points: 0,  xp_level: 1,
      },
      {
        first_name: 'Mr',      last_name: 'Adeyemi',
        email: 'teacher@edugenius.ng', password: 'Teacher@12345',
        role: 'teacher', class_level: null, exam_target: null,
        streak_days: 0,  xp_points: 0,  xp_level: 1,
      },
      {
        first_name: 'Adaeze',  last_name: 'Okonkwo',
        email: 'student@edugenius.ng', password: 'Student@12345',
        role: 'student', class_level: 'SS3', exam_target: 'WAEC',
        streak_days: 14, xp_points: 2340, xp_level: 14,
      },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await client.query(`
        INSERT INTO users
          (first_name, last_name, email, password, role, school_id,
           class_level, exam_target, is_email_verified,
           streak_days, xp_points, xp_level)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,$11)
        ON CONFLICT (email) DO NOTHING
      `, [
        u.first_name, u.last_name, u.email, hash,
        u.role, schoolId, u.class_level, u.exam_target,
        u.streak_days, u.xp_points, u.xp_level,
      ]);
      logger.info(`User seeded: ${u.email}`);
    }

    // ── 3. Seed Questions ────────────────────────────────────
    const questions = [
      {
        exam_type: 'WAEC', curriculum: 'NG', subject: 'Physics', topic: 'Waves & Sound',
        year: 2023, type: 'MCQ', difficulty: 2, approved: true,
        body: 'A wave travels along a stretched string with a velocity of 40 m/s. If the frequency of the wave is 200 Hz, what is the wavelength?',
        options: [
          { text: '0.2 m',  isCorrect: true  },
          { text: '0.4 m',  isCorrect: false },
          { text: '8000 m', isCorrect: false },
          { text: '240 m',  isCorrect: false },
        ],
        answer_index: 0,
        worked_solution: 'Using v = fλ: λ = v/f = 40/200 = 0.2 m',
        formulas_used: ['v = fλ'],
        common_mistakes: 'Students often invert the formula, computing v = f/λ instead of λ = v/f.',
        tags: ['waves', 'speed', 'frequency', 'wavelength'],
      },
      {
        exam_type: 'WAEC', curriculum: 'NG', subject: 'Physics', topic: 'Electricity',
        year: 2022, type: 'MCQ', difficulty: 3, approved: true,
        body: 'Three resistors of 4Ω, 6Ω, and 12Ω are connected in parallel across a 24V supply. The total current drawn is:',
        options: [
          { text: '2 A',  isCorrect: false },
          { text: '8 A',  isCorrect: false },
          { text: '12 A', isCorrect: true  },
          { text: '11 A', isCorrect: false },
        ],
        answer_index: 2,
        worked_solution: '1/R = 1/4+1/6+1/12 = 6/12 → R=2Ω. I=V/R=24/2=12A',
        formulas_used: ['1/R_total = 1/R₁ + 1/R₂ + 1/R₃', 'I = V/R'],
        common_mistakes: 'Adding resistors directly (series formula) instead of using reciprocals.',
        tags: ['electricity', 'parallel', 'resistors', 'ohms-law'],
      },
      {
        exam_type: 'WAEC', curriculum: 'NG', subject: 'Chemistry', topic: 'Organic Chemistry',
        year: 2023, type: 'MCQ', difficulty: 2, approved: true,
        body: 'Which of the following is the functional group of an alcohol?',
        options: [
          { text: '-COOH', isCorrect: false },
          { text: '-OH',   isCorrect: true  },
          { text: '-CHO',  isCorrect: false },
          { text: '-CO-',  isCorrect: false },
        ],
        answer_index: 1,
        worked_solution: 'Alcohols contain the hydroxyl functional group -OH bonded to a carbon atom.',
        formulas_used: ['R-OH (general alcohol formula)'],
        common_mistakes: 'Confusing -OH (alcohol) with -COOH (carboxylic acid).',
        tags: ['organic', 'functional-groups', 'alcohol'],
      },
      {
        exam_type: 'JAMB', curriculum: 'NG', subject: 'Mathematics', topic: 'Integration',
        year: 2022, type: 'MCQ', difficulty: 4, approved: true,
        body: 'Evaluate ∫(3x² + 2x) dx',
        options: [
          { text: 'x³ + x² + C',   isCorrect: true  },
          { text: '6x + 2 + C',    isCorrect: false },
          { text: '3x³ + 2x² + C', isCorrect: false },
          { text: 'x³ + x + C',    isCorrect: false },
        ],
        answer_index: 0,
        worked_solution: '∫3x² dx = x³; ∫2x dx = x². Result: x³ + x² + C',
        formulas_used: ['∫xⁿ dx = xⁿ⁺¹/(n+1) + C'],
        common_mistakes: 'Forgetting the constant of integration C, or miscounting the power.',
        tags: ['calculus', 'integration', 'polynomials'],
      },
      {
        exam_type: 'WAEC', curriculum: 'NG', subject: 'Biology', topic: 'Genetics',
        year: 2023, type: 'MCQ', difficulty: 3, approved: true,
        body: 'In a monohybrid cross between two heterozygous parents (Aa × Aa), what is the expected phenotypic ratio?',
        options: [
          { text: '1:2:1', isCorrect: false },
          { text: '3:1',   isCorrect: true  },
          { text: '1:1',   isCorrect: false },
          { text: '2:1:1', isCorrect: false },
        ],
        answer_index: 1,
        worked_solution: 'Punnett square: AA, Aa, Aa, aa → 3 dominant : 1 recessive phenotype',
        formulas_used: ['Mendelian Genetics: F₂ ratio = 3:1 (phenotype), 1:2:1 (genotype)'],
        common_mistakes: 'Confusing phenotypic ratio (3:1) with genotypic ratio (1:2:1).',
        tags: ['genetics', 'mendelian', 'monohybrid', 'punnett'],
      },
      {
        exam_type: 'UK_GCSE', curriculum: 'UK', subject: 'Physics', topic: 'Forces & Motion',
        year: 2023, type: 'MCQ', difficulty: 2, approved: true,
        body: 'A car accelerates from rest to 20 m/s in 5 seconds. What is the acceleration?',
        options: [
          { text: '2 m/s²',    isCorrect: false },
          { text: '4 m/s²',    isCorrect: true  },
          { text: '100 m/s²',  isCorrect: false },
          { text: '0.25 m/s²', isCorrect: false },
        ],
        answer_index: 1,
        worked_solution: 'a = (v-u)/t = (20-0)/5 = 4 m/s²',
        formulas_used: ['a = (v-u)/t'],
        common_mistakes: 'Using distance/time instead of change in velocity/time.',
        tags: ['kinematics', 'acceleration', 'gcse'],
      },
      {
        exam_type: 'WAEC', curriculum: 'NG', subject: 'Physics', topic: 'Electricity',
        year: 2022, type: 'theory', difficulty: 4, approved: true,
        body: "State Ohm's Law and derive the relationship between resistance, voltage, and current. Describe an experiment to verify Ohm's Law.",
        options: [],
        answer_index: null,
        worked_solution: "V ∝ I → V = IR where R is resistance. SI unit: Ohm (Ω). Experiment: rheostat, ammeter, voltmeter, resistor wire, power supply.",
        formulas_used: ['V = IR'],
        common_mistakes: null,
        tags: ['ohms-law', 'theory', 'experiment', 'electricity'],
      },
    ];

    await client.query(
      `DELETE FROM questions WHERE approved = true AND is_ai_generated = false`
    );

    let count = 0;
    for (const q of questions) {
      await client.query(`
        INSERT INTO questions
          (exam_type, curriculum, subject, topic, year, type, difficulty,
           approved, body, options, answer_index, worked_solution,
           formulas_used, common_mistakes, tags, is_ai_generated)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false)
      `, [
        q.exam_type, q.curriculum, q.subject, q.topic,
        q.year, q.type, q.difficulty, q.approved, q.body,
        JSON.stringify(q.options),
        q.answer_index,
        q.worked_solution,
        JSON.stringify(q.formulas_used),
        q.common_mistakes,
        JSON.stringify(q.tags),
      ]);
      count++;
    }

    await client.query('COMMIT');

    logger.info(`✅ Seeded ${count} questions`);
    logger.info('🎉 Seeding complete');
    logger.info('─────────────────────────────────────');
    logger.info('Test credentials:');
    logger.info('  Admin:   admin@edugenius.ng   / Admin@12345');
    logger.info('  Teacher: teacher@edugenius.ng / Teacher@12345');
    logger.info('  Student: student@edugenius.ng / Student@12345');
    logger.info('─────────────────────────────────────');

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  process.exit(0);
}

seed().catch(err => {
  logger.error('Seed failed:', err.message);
  logger.error(err.stack);
  process.exit(1);
});