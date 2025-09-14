// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // URL complète fournie par Render
  ssl: { rejectUnauthorized: false }           // obligatoire pour Render
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
