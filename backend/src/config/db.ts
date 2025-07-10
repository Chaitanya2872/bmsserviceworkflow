import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  host: process.env.DB_HOST as string,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME as string,
  ssl: process.env.DB_SSL === 'true' 
});


export default pool;
