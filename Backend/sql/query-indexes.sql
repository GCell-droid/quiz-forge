-- Run once against PostgreSQL outside a transaction. CONCURRENTLY avoids
-- blocking normal writes while each index is built.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_responses_user_session"
  ON "question_responses" ("userId", "sessionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quiz_sessions_creator_start"
  ON "quiz_sessions" ("createdBy", "scheduledStart" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quizzes_creator_created"
  ON "quizzes" ("createdBy", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quizzes_visibility_created"
  ON "quizzes" ("visibility", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_bundles_creator"
  ON "question_bundles" ("createdBy");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_bundles_tags_gin"
  ON "question_bundles" USING GIN ("tags");
