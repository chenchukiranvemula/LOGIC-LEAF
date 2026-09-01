PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New chat',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    attachment_url TEXT,
    attachment_type TEXT,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id, created_at ASC);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'API Key',
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    revoked_at INTEGER,
    daily_limit INTEGER NOT NULL DEFAULT 300000,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user
ON api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash
ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    api_key_id TEXT,
    usage_date TEXT NOT NULL,
    requests INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (api_key_id)
        REFERENCES api_keys(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_daily
ON usage(user_id, api_key_id, usage_date);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    conversation_id TEXT,
    filename TEXT NOT NULL,
    content_type TEXT,
    size INTEGER DEFAULT 0,
    storage_key TEXT,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_files_user
ON files(user_id);

CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    conversation_id TEXT,
    query TEXT NOT NULL,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);
