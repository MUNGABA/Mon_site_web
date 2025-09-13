// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const auth = require('../authMiddleware');
const { requireRole } = require('../rolesMiddleware');
require('dotenv').config();

// Multer config pour upload d'images (profile pic)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    cb(null, Date.now() + '.' + ext);
  }
});
const upload = multer({ storage });

// Register candidat
router.post('/register', upload.single('profile_pic'), async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Champs manquants' });

    // role_id pour Candidat
    const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', ['Candidat']);
    const roleId = roleRes.rows[0].id;

    const hashed = await bcrypt.hash(password, 10);
    const profilePicPath = req.file ? req.file.path : null;

    const insert = await db.query(
      `INSERT INTO users (role_id, full_name, email, phone, password, profile_pic)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, full_name, email`,
      [roleId, full_name, email, phone || null, hashed, profilePicPath]
    );

    return res.json({ message: 'Inscription réussie', user: insert.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email déjà utilisé' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login (tous rôles)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Champs manquants' });

    const { rows } = await db.query('SELECT id, password, role_id FROM users WHERE email = $1', [email]);
    if (!rows[0]) return res.status(400).json({ error: 'Utilisateur non trouvé' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect' });

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Connecté', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create agent (directeur only)
router.post('/create-agent', auth, requireRole('Directeur'), async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Champs manquants' });

    const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', ['Agent']);
    const roleId = roleRes.rows[0].id;
    const hashed = await bcrypt.hash(password, 10);

    const insert = await db.query(
      `INSERT INTO users (role_id, full_name, email, phone, password)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, email`,
      [roleId, full_name, email, phone || null, hashed]
    );
    res.json({ message: 'Agent créé', agent: insert.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email déjà utilisé' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create director (directeur only)
router.post('/create-director', auth, requireRole('Directeur'), async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'Champs manquants' });

    const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', ['Directeur']);
    const roleId = roleRes.rows[0].id;
    const hashed = await bcrypt.hash(password, 10);

    const insert = await db.query(
      `INSERT INTO users (role_id, full_name, email, phone, password)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, email`,
      [roleId, full_name, email, phone || null, hashed]
    );
    res.json({ message: 'Directeur créé', director: insert.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email déjà utilisé' });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get all candidates with status and assigned agent (for director & agents)
router.get('/candidates', auth, async (req, res) => {
  try {
    // Only return candidates list (users with role Candidat)
    const q = `
      SELECT u.id, u.full_name, u.email, u.phone, u.profile_pic,
             c.status, c.submitted_at,
             a.agent_id AS assigned_agent_id, ua.full_name AS assigned_agent_name
      FROM users u
      LEFT JOIN candidatures c ON c.user_id = u.id
      LEFT JOIN agent_assignments a ON a.candidate_id = u.id
      LEFT JOIN users ua ON ua.id = a.agent_id
      WHERE u.role_id = (SELECT id FROM roles WHERE name = 'Candidat')
      ORDER BY u.created_at DESC
    `;
    const { rows } = await db.query(q);
    res.json({ candidates: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
