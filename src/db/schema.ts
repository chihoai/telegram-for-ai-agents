export const APP_SCHEMA_VERSION = 1;

export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: '001_init',
    sql: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id bigserial PRIMARY KEY,
  label text NOT NULL UNIQUE,
  session_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peers (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  peer_kind text NOT NULL,
  username text NULL,
  display_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, peer_id)
);

CREATE TABLE IF NOT EXISTS dialogs (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  last_message_id integer NULL,
  last_message_at timestamptz NULL,
  unread_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, peer_id),
  FOREIGN KEY (account_id, peer_id) REFERENCES peers(account_id, peer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  message_id integer NOT NULL,
  sent_at timestamptz NOT NULL,
  sender_peer_id bigint NULL,
  text text NOT NULL,
  is_service boolean NOT NULL DEFAULT false,
  media_type text NULL,
  PRIMARY KEY (account_id, peer_id, message_id),
  FOREIGN KEY (account_id, peer_id) REFERENCES peers(account_id, peer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS messages_by_peer_time
  ON messages(account_id, peer_id, sent_at DESC);
`,
  },
  {
    id: '002_crm',
    sql: `
CREATE TABLE IF NOT EXISTS tags (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, tag)
);

CREATE TABLE IF NOT EXISTS peer_tags (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  tag text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  confidence double precision NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, peer_id, tag),
  FOREIGN KEY (account_id, peer_id) REFERENCES peers(account_id, peer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS companies (
  company_id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, name)
);

CREATE TABLE IF NOT EXISTS peer_company (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  company_id bigint NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  role text NULL,
  source text NOT NULL DEFAULT 'manual',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, peer_id),
  FOREIGN KEY (account_id, peer_id) REFERENCES peers(account_id, peer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  why text NOT NULL,
  priority text NOT NULL DEFAULT 'med',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (account_id, peer_id) REFERENCES peers(account_id, peer_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS tasks_due_open_idx
  ON tasks(account_id, due_at)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS summaries (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  kind text NOT NULL,
  content text NOT NULL,
  source_model text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, peer_id, kind),
  FOREIGN KEY (account_id, peer_id) REFERENCES peers(account_id, peer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_cursors (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  last_synced_message_id integer NULL,
  last_synced_at timestamptz NULL,
  last_run_at timestamptz NULL,
  error text NULL,
  PRIMARY KEY (account_id, peer_id),
  FOREIGN KEY (account_id, peer_id) REFERENCES peers(account_id, peer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS automation_rules (
  rule_id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  contains_text text NOT NULL,
  set_tag text NULL,
  followup_days integer NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_events (
  event_id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  rule_id bigint NOT NULL REFERENCES automation_rules(rule_id) ON DELETE CASCADE,
  peer_id bigint NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rule_events_created_idx
  ON rule_events(account_id, created_at DESC);
`,
  },
];
