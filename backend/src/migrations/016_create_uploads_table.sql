-- Migration 016: Persistent uploads table stored in PostgreSQL
-- Eliminates ephemeral storage loss on serverless/free cloud hosting (Render, Vercel)
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  data BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_filename ON uploads(filename);
