CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  source_text TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL,
  affected_groups JSONB NOT NULL,
  concerns JSONB NOT NULL,
  citizen_questions JSONB NOT NULL,
  next_steps JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS civic_actions (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  tone TEXT NOT NULL,
  audience TEXT NOT NULL,
  extra_context TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS briefs_user_id_created_at_idx ON briefs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_brief_id_created_at_idx ON chat_messages(brief_id, created_at ASC);
CREATE INDEX IF NOT EXISTS civic_actions_brief_id_created_at_idx ON civic_actions(brief_id, created_at DESC);

INSERT INTO briefs (
  id,
  user_id,
  title,
  category,
  jurisdiction,
  source_text,
  summary,
  key_points,
  affected_groups,
  concerns,
  citizen_questions,
  next_steps,
  created_at
)
VALUES (
  'brief-sample-budget',
  NULL,
  'County Budget Public Notice',
  'Budget',
  'Nairobi County',
  'Sample county budget public notice.',
  'The notice invites residents to comment on proposed budget priorities. The clearest public interest issues are service delivery, ward-level allocation, and whether spending plans are easy for citizens to track.',
  '["Residents have a defined public participation window.", "The proposal affects county services such as roads, clinics, schools, and sanitation.", "Budget details should be compared against previous allocations and actual spending."]'::jsonb,
  '["Residents", "Ward representatives", "Small businesses", "Community organizations"]'::jsonb,
  '["The notice may not explain tradeoffs in plain language.", "Some residents may not have enough time or access to participate."]'::jsonb,
  '["Which wards receive the largest increases or cuts?", "How will residents see whether the money was spent as promised?", "What services will be delayed if this budget is approved?"]'::jsonb,
  '["Prepare a short public comment before the deadline.", "Ask your MCA or county office for ward-level allocation details.", "Share a plain-language summary with your community group."]'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, brief_id, role, content, created_at)
VALUES (
  'msg-1',
  'brief-sample-budget',
  'assistant',
  'Ask me what this notice means for residents, budgets, or public participation.',
  NOW()
)
ON CONFLICT (id) DO NOTHING;
