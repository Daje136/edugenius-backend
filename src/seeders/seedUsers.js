require('dotenv').config();
const bcrypt  = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.PG_HOST     || 'localhost',
        port:     parseInt(process.env.PG_PORT || '5432', 10),
        database: process.env.PG_DATABASE || 'edugenius',
        user:     process.env.PG_USER     || 'edugenius_user',
        password: process.env.PG_PASSWORD,
        ssl:      process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }
);

const users = [
  // ── Admin ─────────────────────────────────────────────────────
  {
    first_name: 'Admin',
    last_name:  'Edugenius',
    email:      'admin@edugenius.ng',
    password:   'Admin@12345',
    role:       'admin',
  },
  // ── Teachers ─────────────────────────────────────────────────
  {
    first_name: 'Chidi',
    last_name:  'Okonkwo',
    email:      'teacher@edugenius.ng',
    password:   'Teacher@12345',
    role:       'teacher',
  },
  {
    first_name: 'Amaka',
    last_name:  'Nwosu',
    email:      'amaka@edugenius.ng',
    password:   'Teacher@12345',
    role:       'teacher',
  },
  // ── Students ─────────────────────────────────────────────────
  {
    first_name: 'Student',
    last_name:  'Demo',
    email:      'student@edugenius.ng',
    password:   'Student@12345',
    role:       'student',
  },
  {
    first_name: 'Tolu',
    last_name:  'Adeleke',
    email:      'tolu@edugenius.ng',
    password:   'Student@12345',
    role:       'student',
  },
  {
    first_name: 'Bola',
    last_name:  'Eze',
    email:      'bola@edugenius.ng',
    password:   'Student@12345',
    role:       'student',
  },
];

async function seed() {
  try {
    console.log('🌱 Seeding demo users...');
    let inserted = 0;
    let skipped  = 0;

    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 10);

      const result = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         ON CONFLICT (email) DO NOTHING`,
        [u.first_name, u.last_name, u.email, hashed, u.role]
      );

      if (result.rowCount > 0) {
        console.log(`  ✅ Created ${u.role}: ${u.email}`);
        inserted++;
      } else {
        console.log(`  ⏭️  Skipped (exists): ${u.email}`);
        skipped++;
      }
    }

    console.log(`\n✅ Done! Inserted: ${inserted}, Skipped: ${skipped}`);
    console.log('\n📋 Login credentials:');
    console.log('  admin@edugenius.ng    → Admin@12345');
    console.log('  teacher@edugenius.ng  → Teacher@12345');
    console.log('  student@edugenius.ng  → Student@12345');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
