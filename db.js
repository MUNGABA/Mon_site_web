// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // provider (Railway) often gives full URL
  // if DATABASE_URL not present, fallback to individual vars:
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
