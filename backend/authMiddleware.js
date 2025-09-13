// authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');

const authMiddleware = async (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token manquant' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token malformé' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Récupérer l'utilisateur minimal (id, role_id)
    const { rows } = await db.query('SELECT id, role_id, full_name, email FROM users WHERE id = $1', [payload.id]);
    if (!rows[0]) return res.status(401).json({ error: 'Utilisateur introuvable' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = authMiddleware;
