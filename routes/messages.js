// routes/messages.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../authMiddleware');

// send message candidat -> candidat
router.post('/send', auth, async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    if (!receiver_id || !content) return res.status(400).json({ error: 'Champs manquants' });

    // only candidates can message other candidates (business rule)
    const senderRole = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    if (!senderRole.rows[0] || senderRole.rows[0].name !== 'Candidat') return res.status(403).json({ error: 'Seuls les candidats peuvent utiliser cette route' });

    const rec = await db.query('SELECT * FROM users WHERE id = $1', [receiver_id]);
    if (!rec.rows[0]) return res.status(404).json({ error: 'Destinataire introuvable' });

    const insert = await db.query(
      'INSERT INTO candidate_messages (sender_id, receiver_id, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, receiver_id, content]
    );
    res.json({ message: 'Envoyé', data: insert.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// get conversation between authenticated user and another candidate (both directions)
router.get('/conversation/:otherId', auth, async (req, res) => {
  try {
    const otherId = parseInt(req.params.otherId, 10);
    const q = `
      SELECT * FROM candidate_messages
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `;
    const { rows } = await db.query(q, [req.user.id, otherId]);
    res.json({ conversation: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
