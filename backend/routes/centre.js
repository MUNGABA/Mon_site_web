// routes/centre.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../authMiddleware');

// candidate sends message to centre (no agent yet)
router.post('/send', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenu manquant' });

    // only candidates send initial centre messages
    const roleRes = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    if (roleRes.rows[0].name !== 'Candidat') return res.status(403).json({ error: 'Seuls les candidats peuvent initier' });

    const inserted = await db.query(
      'INSERT INTO centre_messages (candidate_id, content) VALUES ($1,$2) RETURNING *',
      [req.user.id, content]
    );

    res.json({ message: 'Message envoyé au centre', data: inserted.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// get centre conversation for a candidate (visible to director + assigned agent)
router.get('/conversation/:candidateId', auth, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);

    // check permissions: director OR assigned agent OR the candidate himself
    const roleRes = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    const roleName = roleRes.rows[0].name;

    if (roleName === 'Candidat' && req.user.id !== candidateId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (roleName === 'Agent') {
      // check agent is assigned to candidate
      const assign = await db.query('SELECT * FROM agent_assignments WHERE candidate_id = $1 AND agent_id = $2', [candidateId, req.user.id]);
      if (!assign.rows[0]) return res.status(403).json({ error: 'Accès refusé (non assigné)' });
    }

    // else director has access

    const conv = await db.query('SELECT * FROM centre_messages WHERE candidate_id = $1 ORDER BY created_at ASC', [candidateId]);
    res.json({ conversation: conv.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// agent picks up a candidate (assign agent) - agent must exist; candidate must have centre messages
router.post('/assign/:candidateId', auth, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);

    // only agents can pick, or director to force-assign
    const roleRes = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    const roleName = roleRes.rows[0].name;

    if (roleName !== 'Agent' && roleName !== 'Directeur') return res.status(403).json({ error: 'Seuls les agents ou directeur peuvent assigner' });

    // check there are centre messages from candidate
    const cm = await db.query('SELECT * FROM centre_messages WHERE candidate_id = $1', [candidateId]);
    if (!cm.rows[0]) return res.status(400).json({ error: 'Aucun message de ce candidat au centre' });

    // if director assigns, they must include agent_id in body
    let agentIdToAssign = req.user.id;
    if (roleName === 'Directeur') {
      if (!req.body.agent_id) return res.status(400).json({ error: 'Pour assigner via le directeur, fournir agent_id' });
      agentIdToAssign = req.body.agent_id;
    }

    // create or update assignment (ensure uniqueness candidate_id)
    // if assignment exists, respond conflict
    const exists = await db.query('SELECT * FROM agent_assignments WHERE candidate_id = $1', [candidateId]);
    if (exists.rows[0]) return res.status(400).json({ error: 'Candidat déjà assigné' });

    const ins = await db.query('INSERT INTO agent_assignments (agent_id, candidate_id) VALUES ($1,$2) RETURNING *', [agentIdToAssign, candidateId]);

    // update centre_messages to set agent_id on existing messages (optional but helpful)
    await db.query('UPDATE centre_messages SET agent_id = $1 WHERE candidate_id = $2', [agentIdToAssign, candidateId]);

    res.json({ message: 'Candidat assigné', assignment: ins.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// reply in centre (agent or director)
router.post('/reply/:candidateId', auth, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidateId, 10);
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenu manquant' });

    const roleRes = await db.query('SELECT name FROM roles WHERE id = $1', [req.user.role_id]);
    const roleName = roleRes.rows[0].name;

    if (roleName === 'Agent') {
      // ensure agent is assigned to candidate
      const assign = await db.query('SELECT * FROM agent_assignments WHERE candidate_id = $1 AND agent_id = $2', [candidateId, req.user.id]);
      if (!assign.rows[0]) return res.status(403).json({ error: 'Vous n\'êtes pas assigné à ce candidat' });

      const ins = await db.query('INSERT INTO centre_messages (candidate_id, agent_id, content) VALUES ($1,$2,$3) RETURNING *', [candidateId, req.user.id, content]);
      return res.json({ message: 'Réponse envoyée', data: ins.rows[0] });
    } else if (roleName === 'Directeur') {
      const ins = await db.query('INSERT INTO centre_messages (candidate_id, director_id, content) VALUES ($1,$2,$3) RETURNING *', [candidateId, req.user.id, content]);
      return res.json({ message: 'Réponse du directeur envoyée', data: ins.rows[0] });
    } else {
      return res.status(403).json({ error: 'Seuls agents et directeur peuvent répondre' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
