-- AI quality: automated evaluation scores and real user feedback.
--
-- Both tables hang off the same key as ai_usage (migration 045): the ai-core
-- `request_id`, which identifies one conversational turn. Within a turn the
-- user-visible answer is the 'job-main-turn' row, so that is what gets
-- evaluated and what feedback refers to. Joining usage + evaluation +
-- feedback on request_id is what makes "quality vs cost" answerable.
--
-- Written by the Python ai-core service; the Node backend only reads them.
--
-- Deliberately NOT stored here: the prompt, the retrieved chunks, the chart,
-- or any chain-of-thought. The question and answer already live in the
-- conversation system, and an analytics table is the wrong place for a second
-- copy of user content.

CREATE TABLE IF NOT EXISTS ai_evaluations (
  id              BIGSERIAL PRIMARY KEY,

  -- One evaluation per turn. Re-running the evaluator updates in place
  -- rather than inflating the averages with duplicates.
  request_id      TEXT NOT NULL UNIQUE,

  user_id         TEXT,
  conversation_id TEXT,

  -- Scores are stored 0..1, which is the scale the dashboard and any future
  -- preference dataset want. The judge itself is prompted on a 0-10 scale —
  -- models discriminate better with that granularity — and the conversion
  -- happens once, at this boundary.
  --
  -- NULL means the judge did not return that dimension, which is different
  -- from scoring it zero. An absent dimension is dropped from the reward
  -- average rather than dragging it down.
  relevance_score        NUMERIC(4, 3),
  grounding_score        NUMERIC(4, 3),
  personalization_score  NUMERIC(4, 3),
  completeness_score     NUMERIC(4, 3),

  human_likeness_score   NUMERIC(4, 3),
  hinglish_quality_score NUMERIC(4, 3),
  whatsapp_style_score   NUMERIC(4, 3),
  clarity_score          NUMERIC(4, 3),
  conciseness_score      NUMERIC(4, 3),
  warmth_score           NUMERIC(4, 3),

  -- Kept although the spec's weight table omits it. Dropping a safety signal
  -- from an astrology product would be a regression, so it is scored and
  -- stored, but it is a GATE rather than a weighted term: see reward.py.
  -- Averaging safety in would let a high score elsewhere paper over a reply
  -- that predicted a lifespan.
  safety_score           NUMERIC(4, 3),

  -- Weighted 0..1 summary. An internal comparison metric, never ground truth
  -- and never the same thing as a real user saying it helped.
  reward_score           NUMERIC(4, 3),

  -- Which deterministic checks failed (prompt leak, unsupported chart claim,
  -- …). These are computed in code, not by the judge, and they cap the reward.
  deterministic_failures TEXT[] NOT NULL DEFAULT '{}',

  -- False when the judge could not be reached and only the deterministic
  -- checks ran. The dashboard says so rather than presenting a partial score
  -- as a full evaluation.
  judge_used      BOOLEAN NOT NULL DEFAULT FALSE,

  evaluator_provider TEXT,
  evaluator_model    TEXT,
  -- Bumped whenever the dimensions or weights change, so scores from
  -- different rubrics are never averaged together by accident.
  evaluation_version TEXT NOT NULL DEFAULT 'v1',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_evaluations_created_idx ON ai_evaluations (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_evaluations_user_idx    ON ai_evaluations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_evaluations_conv_idx    ON ai_evaluations (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_evaluations_reward_idx  ON ai_evaluations (reward_score);


-- What the user actually said about the answer. This is the signal that
-- matters most; the automated scores above are an estimate of it.
CREATE TABLE IF NOT EXISTS ai_feedback (
  id              BIGSERIAL PRIMARY KEY,

  -- One verdict per user per turn. A user changing their mind UPDATEs this
  -- row rather than adding a second one, so the helpful-rate cannot be
  -- skewed by someone clicking twice.
  request_id      TEXT NOT NULL,
  user_id         TEXT NOT NULL,

  conversation_id TEXT,

  -- 'helpful' | 'not_helpful'
  feedback_type   TEXT NOT NULL,

  -- Optional 1-5. Null is the normal case: the thumb is the primary signal
  -- and the UI must not nag for more.
  rating          SMALLINT,

  -- Optional structured reason, e.g. 'too_generic', 'poor_hinglish'.
  feedback_reason  TEXT,
  -- Optional free text. Bounded by the API before it reaches here.
  feedback_comment TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ai_feedback_type_valid CHECK (feedback_type IN ('helpful', 'not_helpful')),
  CONSTRAINT ai_feedback_rating_range CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5))
);

-- The "one verdict per user per turn" guarantee.
CREATE UNIQUE INDEX IF NOT EXISTS ai_feedback_request_user_key
  ON ai_feedback (request_id, user_id);

CREATE INDEX IF NOT EXISTS ai_feedback_created_idx ON ai_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_feedback_type_idx    ON ai_feedback (feedback_type);
CREATE INDEX IF NOT EXISTS ai_feedback_user_idx    ON ai_feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_feedback_reason_idx  ON ai_feedback (feedback_reason);
