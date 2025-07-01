const { Pool } = require('pg');
require('dotenv').config({ path: '/etc/secrets/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl:process.env.DB_SSL
});

module.exports = pool;
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
