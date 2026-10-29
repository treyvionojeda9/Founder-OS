-- Founder OS: Chapter 3 Practical Schema (5-Table Instructional Subset)
-- Enforces Human Vault vs. Machine Vault separation and task approval provenance.

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    vault TEXT NOT NULL CHECK (vault IN ('human','machine')),
    author_id TEXT NOT NULL,
    current_revision INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE note_revisions (
    note_id TEXT REFERENCES notes(id),
    rev INTEGER NOT NULL,
    blob_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(note_id, rev)
);

CREATE TABLE links (
    src_note TEXT REFERENCES notes(id),
    dst_note TEXT REFERENCES notes(id),
    link_kind TEXT NOT NULL,
    provenance TEXT NOT NULL,
    PRIMARY KEY(src_note, dst_note, link_kind, provenance)
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    state TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    source_note_id TEXT,
    approval_id TEXT,
    idempotency_key TEXT UNIQUE
);
