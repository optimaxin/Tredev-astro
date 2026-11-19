-- Cache for the NVIDIA NIM description-rewriting layer (kundliDescriptionRewriter.ts).
-- Keyed by content hash + language + prompt version, NOT by user/birth details —
-- the same template-generated sentence (e.g. "Mars in the 10th house in Aries...")
-- recurs across many different users' charts, so this cache is shared and reused
-- across requests, not per-user. Regenerated only when the original text or the
-- prompt version changes (a model/prompt tweak bumps PROMPT_VERSION, which changes
-- every key and naturally invalidates the old rows without deleting them).
CREATE TABLE kundli_description_rewrites (
  text_hash TEXT NOT NULL,
  language TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  original_text TEXT NOT NULL,
  rewritten_text TEXT NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (text_hash, language, prompt_version)
);
