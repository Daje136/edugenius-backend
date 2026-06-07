require('dotenv').config();
const {Sequelize}=require('sequelize');
const sq=process.env.DATABASE_URL?new Sequelize(process.env.DATABASE_URL,{dialect:'postgres',dialectOptions:{ssl:{rejectUnauthorized:false}},logging:false}):new Sequelize(process.env.PG_DATABASE,process.env.PG_USER,process.env.PG_PASSWORD,{host:process.env.PG_HOST||'localhost',dialect:'postgres',logging:false});
async function run(){
  try{
    const [cols]=await sq.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
    console.log('Users columns:');
    cols.forEach(c=>console.log(' ',c.column_name,'->',c.data_type));
    const [rows]=await sq.query("SELECT id, email, role FROM users LIMIT 3");
    console.log('Sample users:',JSON.stringify(rows));
    process.exit(0);
  }catch(e){console.error(e.message);process.exit(1);}
}
run();