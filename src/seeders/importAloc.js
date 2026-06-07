'use strict';
require('dotenv').config();
const https     = require('https');
const { Sequelize, DataTypes } = require('sequelize');

// ── DB connection (self-contained, no circular deps) ──────────────────────────
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: { ssl: { rejectUnauthorized: false } },
      logging: false,
    })
  : new Sequelize(
      process.env.PG_DATABASE || 'edugenius',
      process.env.PG_USER     || 'edugenius_user',
      process.env.PG_PASSWORD,
      {
        host:    process.env.PG_HOST || 'localhost',
        port:    parseInt(process.env.PG_PORT || '5432'),
        dialect: 'postgres',
        logging: false,
        dialectOptions: process.env.PG_SSL === 'true'
          ? { ssl: { rejectUnauthorized: false } }
          : {},
      }
    );

// Inline model — mirrors your src/models/postgres/Question.js
const Question = sequelize.define('Question', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  examType:       { type: DataTypes.STRING, allowNull: false, field: 'exam_type' },
  subject:        { type: DataTypes.STRING, allowNull: false },
  topic:          { type: DataTypes.STRING },
  year:           { type: DataTypes.INTEGER },
  type:           { type: DataTypes.STRING, defaultValue: 'MCQ' },
  body:           { type: DataTypes.TEXT, allowNull: false },
  options:        { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  answerIndex:    { type: DataTypes.INTEGER, field: 'answer_index' },
  workedSolution: { type: DataTypes.TEXT, field: 'worked_solution' },
  difficulty:     { type: DataTypes.INTEGER, defaultValue: 3 },
  curriculum:     { type: DataTypes.STRING, defaultValue: 'NG' },
  tags:           { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  isApproved:     { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_approved' },
  createdBy:      { type: DataTypes.UUID, field: 'created_by' },
}, { tableName: 'questions', underscored: true });

// ── Config ────────────────────────────────────────────────────────────────────
const ACCESS_TOKEN = process.env.ALOC_TOKEN || 'QB-230fb9733e8fab71cdde';

const SUBJECTS = [
  { name: 'mathematics', dbName: 'Mathematics'     },
  { name: 'english',     dbName: 'English Language' },
  { name: 'physics',     dbName: 'Physics'          },
  { name: 'chemistry',   dbName: 'Chemistry'        },
  { name: 'biology',     dbName: 'Biology'          },
  { name: 'economics',   dbName: 'Economics'        },
  { name: 'government',  dbName: 'Government'       },
  { name: 'literature',  dbName: 'Literature'       },
  { name: 'geography',   dbName: 'Geography'        },
  { name: 'commerce',    dbName: 'Commerce'         },
  { name: 'accounting',  dbName: 'Accounting'       },
  { name: 'agriculture', dbName: 'Agriculture'      },
];

const YEARS = [];
for (let y = 2006; y <= 2024; y++) YEARS.push(y);

// Aloc supports utme (JAMB) and wassce (WAEC). NECO not available via Aloc.
const EXAM_TYPES = [
  { type: 'utme',   dbType: 'JAMB' },
  { type: 'wassce', dbType: 'WAEC' },
];

const DELAY_MS    = 1200; // ms between requests — stay within rate limit
const MAX_RETRIES = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Accept':        'application/json',
        'User-Agent':    'EduGenius/1.0',
        'AccessToken':   ACCESS_TOKEN,
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
      },
      timeout: 15000,
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try   { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// Map Aloc answer letter (a/b/c/d) to 0-based index
const ANSWER_MAP = { a: 0, b: 1, c: 2, d: 3 };

function parseQuestion(raw, subject, examType, year) {
  const body = (raw.question || '').trim();
  if (!body) return null;

  const options = [
    raw.option?.a || raw.option_a || '',
    raw.option?.b || raw.option_b || '',
    raw.option?.c || raw.option_c || '',
    raw.option?.d || raw.option_d || '',
  ].map(o => o.trim()).filter(Boolean);

  if (options.length < 2) return null;

  const answerIndex = ANSWER_MAP[raw.answer?.toLowerCase()] ?? 0;

  return {
    examType,
    subject,
    year,
    topic:          raw.topic || 'General',
    type:           'MCQ',
    body,
    options,
    answerIndex,
    workedSolution: raw.solution || raw.explanation || null,
    difficulty:     2,           // Aloc doesn't provide difficulty; default medium
    curriculum:     'NG',
    tags:           [],
    isApproved:     true,
  };
}

// ── Main import ───────────────────────────────────────────────────────────────
async function importAll() {
  await sequelize.authenticate();
  await Question.sync();

  console.log('🚀 Aloc API import started');
  console.log(`📚 Subjects : ${SUBJECTS.length}`);
  console.log(`📅 Years    : ${YEARS[0]} – ${YEARS[YEARS.length - 1]}`);
  console.log(`📝 Exam types: JAMB, WAEC`);
  console.log('─'.repeat(50));

  let totalSaved  = 0;
  let totalFailed = 0;
  let totalSkip   = 0;
  const stats     = {};

  for (const examType of EXAM_TYPES) {
    for (const subject of SUBJECTS) {
      for (const year of YEARS) {

        const url =
          'https://questions.aloc.com.ng/api/v2/q/20' +
          '?subject=' + subject.name +
          '&year='    + year +
          '&type='    + examType.type +
          '&token='   + ACCESS_TOKEN;

        process.stdout.write(
          `⏳ ${examType.dbType} | ${subject.dbName.padEnd(16)} | ${year} ... `
        );

        let data = null;
        let fetchError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            data = await fetchJSON(url);
            break;
          } catch (err) {
            fetchError = err;
            if (attempt < MAX_RETRIES) {
              process.stdout.write(`🔄 retry ${attempt}... `);
              await sleep(3000 * attempt);
            }
          }
        }

        if (!data) {
          console.log(`❌ ${fetchError?.message || 'No response'}`);
          await sleep(DELAY_MS);
          continue;
        }

        if (!Array.isArray(data.data) || data.data.length === 0) {
          console.log(`⚠️  Empty (${data.status || data.message || 'no data'})`);
          await sleep(DELAY_MS);
          continue;
        }

        let saved = 0;
        let skip  = 0;

        for (const raw of data.data) {
          const parsed = parseQuestion(raw, subject.dbName, examType.dbType, year);
          if (!parsed) { totalFailed++; continue; }

          try {
            const [, created] = await Question.findOrCreate({
              where: { body: parsed.body, examType: parsed.examType },
              defaults: parsed,
            });
            if (created) { saved++; }
            else         { skip++;  totalSkip++; }
          } catch {
            totalFailed++;
          }
        }

        totalSaved += saved;
        stats[examType.dbType] = (stats[examType.dbType] || 0) + saved;
        console.log(`✅ ${saved} saved, ${skip} skipped`);

        await sleep(DELAY_MS);
      }
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Total inserted : ${totalSaved}`);
  console.log(`⏭️  Already existed: ${totalSkip}`);
  console.log(`❌ Errors         : ${totalFailed}`);
  console.log('\n📊 By exam type:');
  for (const [type, count] of Object.entries(stats)) {
    console.log(`   ${type}: ${count}`);
  }
  console.log('🎉 Import complete!');
  process.exit(0);
}

importAll().catch(err => {
  console.error('❌ Import failed:', err.message);
  process.exit(1);
});
