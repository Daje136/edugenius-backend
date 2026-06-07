require('dotenv').config();
const {Sequelize}=require('sequelize');
const sq=process.env.DATABASE_URL?new Sequelize(process.env.DATABASE_URL,{dialect:'postgres',dialectOptions:{ssl:{rejectUnauthorized:false}},logging:false}):new Sequelize(process.env.PG_DATABASE,process.env.PG_USER,process.env.PG_PASSWORD,{host:process.env.PG_HOST||'localhost',dialect:'postgres',logging:false});
async function run(){
  try{
    await sq.query('DROP TABLE IF EXISTS exam_sessions CASCADE');
    console.log('Dropped');
    await sq.query("CREATE TABLE exam_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id INTEGER NOT NULL, exam_type VARCHAR(30) NOT NULL, subject VARCHAR(100) NOT NULL, topic VARCHAR(100), year INTEGER, total_questions INTEGER DEFAULT 0, answered INTEGER DEFAULT 0, correct INTEGER DEFAULT 0, score FLOAT, time_allotted_seconds INTEGER DEFAULT 3600, time_spent_seconds INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'in_progress', answers_json JSONB DEFAULT '[]'::jsonb, weak_topics_detected TEXT[] DEFAULT ARRAY[]::TEXT[], xp_earned INTEGER DEFAULT 0, submitted_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())");
    console.log('Created!');
    const [c]=await sq.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='exam_sessions' ORDER BY ordinal_position");
    console.log(c.map(x=>x.column_name+':'+x.data_type).join(', '));
    process.exit(0);
  }catch(e){console.error(e.message);process.exit(1);}
}
run();