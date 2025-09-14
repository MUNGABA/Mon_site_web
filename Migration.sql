-- Migration.sql
-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name)
SELECT * FROM (VALUES ('Candidat'), ('Agent'), ('Directeur')) AS t(name)
ON CONFLICT (name) DO NOTHING;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    role_id INT REFERENCES roles(id),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    profile_pic VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidatures
CREATE TABLE IF NOT EXISTS candidatures (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP DEFAULT NOW(),
    approved_by INT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'en_attente'
);

-- Agent assignments: un candidat a au plus un agent, un agent peut avoir plusieurs candidats
CREATE TABLE IF NOT EXISTS agent_assignments (
    id SERIAL PRIMARY KEY,
    agent_id INT REFERENCES users(id),
    candidate_id INT REFERENCES users(id) UNIQUE,
    assigned_at TIMESTAMP DEFAULT NOW()
);

-- Messages candidats <-> candidats
CREATE TABLE IF NOT EXISTS candidate_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id),
    receiver_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Chat centre (candidate writes to centre; agent_id NULL tant qu'aucun agent n'a repris)
CREATE TABLE IF NOT EXISTS centre_messages (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES users(id),
    agent_id INT REFERENCES users(id),
    director_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes utiles
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_candidatures_user ON candidatures(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent ON agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_centre_candidate ON centre_messages(candidate_id);