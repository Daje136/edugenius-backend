'use strict';
const https = require('https');
const pool  = require('../config/postgres');

const ACCESS_TOKEN = 'QB-230fb9733e8fab71cdde';

const SUBJECTS = [
  { name: 'mathematics',  dbName: 'Mathematics' },
  { name: 'english',      dbName: 'English Language' },
  { name: 'physics',      dbName: 'Physics' },
  { name: 'chemistry',    dbName: 'Chemistry' },
  { name: 'biology',      dbName: 'Biology' },
  { name: 'economics',    dbName: 'Economics' },
  { name: 'government',   dbName: 'Government' },
  { name: 'literature',   dbName: 'Literature' },
  { name: 'geography',    dbName: 'Geography' },
  { name: 'commerce',     dbName: 'Commerce' },
  { name: 'accounting',   dbName: 'Accounting' },
  { name: 'agriculture',  dbName: 'Agriculture' },
];

const YEARS = [];
for (let y = 2006; y <= 2023; y++) YEARS.push(y);

const EXAM_TYPES = [
  { type: 'utme',   dbType: 'JAMB' },
  { type: 'wassce', dbType: 'WAEC' },
];

const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
  'Accept':        'application/json',
  'User-Agent':    'EduGenius/1.0',
  'AccessToken':   ACCESS_TOKEN,
  'Authorization': 'Bearer ' + ACCESS_TOKEN,
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    }).on('error', reject);
  });
}

async function saveQuestion(q, dbSubject, dbExamType, year) {
  try {
    const body = q.question;
    if (!body) return false;

    const options = [
      q.option?.a || q.option_a || '',
      q.option?.b || q.option_b || '',
      q.option?.c || q.option_c || '',
      q.option?.d || q.option_d || '',
    ].filter(o => o.trim() !== '');

    if (options.length < 2) return false;

    const answerMap   = { a: 0, b: 1, c: 2, d: 3 };
    const answerIndex = answerMap[q.answer?.toLowerCase()] ?? 0;

    await pool.query(
      `INSERT INTO questions
        (exam_type, subject, year, topic, body, options, answer_index,
         difficulty, approved, class_level, curriculum)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [
        dbExamType, dbSubject, year,
        q.topic || 'General', body,
        JSON.stringify(options), answerIndex,
        2, true, 'SS3', 'NG',
      ]
    );
    return true;
  } catch (e) {
    return false;
  }
}

async function importAll() {
  console.log('🚀 Starting Aloc API import...');
  console.log('📚 Subjects: ' + SUBJECTS.length);
  console.log('📅 Years: 2006 - 2023');
  console.log('📝 Exam types: JAMB, WAEC');
  console.log('---------------------------------\n');

  let totalSaved  = 0;
  let totalFailed = 0;

  for (const examType of EXAM_TYPES) {
    for (const subject of SUBJECTS) {
      for (const year of YEARS) {

        const url = 'https://questions.aloc.com.ng/api/v2/q/20' +
             '?subject=' + subject.name +
             '&year='    + year +
             '&type='    + examType.type +
             '&token='   + ACCESS_TOKEN;

        process.stdout.write(
          '⏳ ' + examType.dbType + ' ' + subject.dbName + ' ' + year + '...'
        );

        try {
          // Retry up to 3 times on connection error
          let data = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              data = await fetchJSON(url);
              break;
            } catch (connErr) {
              if (attempt < 3) {
                process.stdout.write(` 🔄 Retry ${attempt}...`);
                await sleep(3000);
              } else {
                throw connErr;
              }
            }
          }

          if (!data || !Array.isArray(data.data) || data.data.length === 0) {
            const reason = data?.status || data?.message || 'empty';
            console.log(' ⚠️  No data (' + reason + ')');
            await sleep(DELAY_MS);
            continue;
          }

          let saved = 0;
          for (const q of data.data) {
            const ok = await saveQuestion(
              q, subject.dbName, examType.dbType, year
            );
            if (ok) saved++;
            else totalFailed++;
          }

          totalSaved += saved;
          console.log(' ✅ Saved ' + saved);

        } catch (e) {
          console.log(' ❌ ' + e.message);
        }

        await sleep(DELAY_MS);
      }
    }
  }

  console.log('\n---------------------------------');
  console.log('✅ Total saved:  ' + totalSaved);
  console.log('❌ Total failed: ' + totalFailed);
  console.log('🎉 Import complete!');
  process.exit(0);
}

importAll().catch(e => {
  console.error('❌ Import failed: ' + e.message);
  process.exit(1);
});