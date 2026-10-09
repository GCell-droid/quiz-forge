CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_responses_user_session"
  ON "question_responses" ("userId", "sessionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_responses_session"
  ON "question_responses" ("sessionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quiz_sessions_creator_start"
  ON "quiz_sessions" ("createdBy", "scheduledStart" DESC, "sessionId" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quizzes_creator_created"
  ON "quizzes" ("createdBy", "createdAt" DESC, "quizId" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quizzes_visibility_created"
  ON "quizzes" ("visibility", "createdAt" DESC, "quizId" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_bundles_creator"
  ON "question_bundles" ("createdBy", "createdAt" DESC, "bundleId" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_bundles_visibility_created"
  ON "question_bundles" ("visibility", "createdAt" DESC, "bundleId" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_question_bundles_tags_gin"
  ON "question_bundles" USING GIN ("tags");
