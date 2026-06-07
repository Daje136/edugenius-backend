require('dotenv').config();
const {Sequelize}=require('sequelize');
const sq=process.env.DATABASE_URL?new Sequelize(process.env.DATABASE_URL,{dialect:'postgres',dialectOptions:{ssl:{rejectUnauthorized:false}},logging:false}):new Sequelize(process.env.PG_DATABASE,process.env.PG_USER,process.env.PG_PASSWORD,{host:process.env.PG_HOST||'localhost',dialect:'postgres',logging:false});
async function run(){
  try{
    await sq.query("UPDATE questions SET is_approved=true");
    console.log('All questions approved');
    const [[{count}]]=await sq.query("SELECT COUNT(*) as count FROM questions");
    console.log('Total questions:', count);
    const [rows]=await sq.query("SELECT exam_type, COUNT(*) as count FROM questions GROUP BY exam_type ORDER BY count DESC");
    rows.forEach(r=>console.log(' ',r.exam_type,'->',r.count));
    process.exit(0);
  }catch(e){console.error(e.message);process.exit(1);}
}
run();
