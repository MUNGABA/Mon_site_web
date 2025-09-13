// index.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const usersRoutes = require('./routes/users');
const candidaturesRoutes = require('./routes/candidatures');
const messagesRoutes = require('./routes/messages');
const centreRoutes = require('./routes/centre');

const app = express();
const PORT = process.env.PORT || 3000;

// ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// routes
app.use('/api/users', usersRoutes);
app.use('/api/candidatures', candidaturesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/centre', centreRoutes);

app.get('/', (req, res) => res.send('API MonProjet en ligne'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
