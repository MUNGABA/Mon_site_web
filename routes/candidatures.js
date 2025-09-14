// routes/candidatures.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../authMiddleware');

// submit candidature (candidat only)
router.post('/submit', auth, async (req, res) => {
  try {
    // vérifier rôle candidat
    const role = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    if (!role.rows[0] || role.rows[0].name !== 'Candidat') return res.status(403).json({ error: 'Seuls les candidats peuvent postuler' });

    // vérifier s'il n'a pas déjà une candidature
    const check = await db.query('SELECT * FROM candidatures WHERE user_id = $1', [req.user.id]);
    if (check.rows[0]) return res.status(400).json({ error: 'Candidature déjà soumise' });

    const insert = await db.query('INSERT INTO candidatures (user_id, status) VALUES ($1, $2) RETURNING *', [req.user.id, 'en_attente']);
    res.json({ message: 'Candidature soumise', candidature: insert.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Approve candidature: by assigned agent or director
router.post('/approve/:candidatureId', auth, async (req, res) => {
  try {
    const candId = parseInt(req.params.candidatureId, 10);
    const cand = await db.query('SELECT * FROM candidatures WHERE id = $1', [candId]);
    if (!cand.rows[0]) return res.status(404).json({ error: 'Candidature introuvable' });

    const candidature = cand.rows[0];
    // check if actor is director
    const actorRole = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    const actorRoleName = actorRole.rows[0].name;

    let authorized = false;
    if (actorRoleName === 'Directeur') authorized = true;
    else {
      // check if req.user is assigned agent for this candidate
      const assignment = await db.query('SELECT * FROM agent_assignments WHERE candidate_id = $1 AND agent_id = $2', [candidature.user_id, req.user.id]);
      if (assignment.rows[0]) authorized = true;
    }

    if (!authorized) return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à approuver cette candidature' });

    await db.query('UPDATE candidatures SET status = $1, approved_by = $2 WHERE id = $3', ['approuvé', req.user.id, candId]);
    res.json({ message: 'Candidature approuvée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Reject candidature: by assigned agent or director
router.post('/reject/:candidatureId', auth, async (req, res) => {
  try {
    const candId = parseInt(req.params.candidatureId, 10);
    const cand = await db.query('SELECT * FROM candidatures WHERE id = $1', [candId]);
    if (!cand.rows[0]) return res.status(404).json({ error: 'Candidature introuvable' });

    const candidature = cand.rows[0];
    const actorRole = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    const actorRoleName = actorRole.rows[0].name;

    let authorized = false;
    if (actorRoleName === 'Directeur') authorized = true;
    else {
      const assignment = await db.query('SELECT * FROM agent_assignments WHERE candidate_id = $1 AND agent_id = $2', [candidature.user_id, req.user.id]);
      if (assignment.rows[0]) authorized = true;
    }
    if (!authorized) return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à rejeter cette candidature' });

    await db.query('UPDATE candidatures SET status = $1, approved_by = $2 WHERE id = $3', ['refusé', req.user.id, candId]);
    res.json({ message: 'Candidature refusée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
