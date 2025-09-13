// rolesMiddleware.js
const db = require('./db');

function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
      const { rows } = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
      if (!rows[0]) return res.status(403).json({ error: 'Rôle introuvable' });
      if (rows[0].name !== roleName) return res.status(403).json({ error: 'Accès refusé: rôle requis ' + roleName });
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  };
}

module.exports = { requireRole };
