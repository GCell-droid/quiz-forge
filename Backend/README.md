# Quiz Forge — Backend

> **NestJS 11 · TypeScript · PostgreSQL · Redis · BullMQ · Socket.IO · Gemini AI**

A real-time quiz platform backend where teachers create quizzes (manually or via AI), schedule live sessions, and students join via WebSocket to answer in real-time.

---

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | NestJS 11                           |
| Language       | TypeScript (ES2023)                 |
| Database       | PostgreSQL (TypeORM)                |
| Cache & Queues | Redis + BullMQ                      |
| Real-time      | Socket.IO                           |
| Auth           | Passport (JWT + Google OAuth)       |
| AI             | Google Gemini                       |
| Validation     | class-validator / class-transformer |
| Rate Limiting  | @nestjs/throttler                   |

---

## Project Structure

```
src/
├── main.ts                    # Bootstrap (CORS, cookies, validation pipe)
├── app.module.ts              # Root module (DB, Redis, BullMQ config)
├── auth/                      # Authentication & authorization
│   ├── config/                # Google OAuth config
│   ├── decorators/            # @CurrentUser, @Roles
│   ├── dto/                   # Login, Register, GoogleRegister DTOs
│   ├── guards/                # JWT, Google, Roles guards
│   └── strategy/              # JWT & Google Passport strategies
├── quizzes/                   # Quiz & question bundle CRUD
│   ├── dto/                   # Bundle & Quiz DTOs
│   └── entities/              # Quiz, Question, QuizQuestion, QuestionBundle, BundleQuestion
├── sessions/                  # Live quiz session management
│   ├── dto/                   # Join session DTO
│   ├── entities/              # QuizSession, QuizParticipant, QuizInvite
│   ├── events/                # Socket.IO gateway
│   └── processors/            # BullMQ workers (lifecycle, answer ingestion)
├── gemini/                    # AI quiz generation
│   ├── dto/                   # GenerateQuiz DTO
│   └── guards/                # Gemini-specific throttle guard
├── responses/                 # Student answer storage
│   ├── dto/
│   └── entities/              # QuestionResponse entity
├── analytics/                 # Leaderboards & aggregations
│   └── entities/              # LeaderboardSnapshot, ResponseAggregation
├── user/                      # User profile
├── redis/                     # Global Redis service
└── common/
    ├── entity/                # User entity
    └── enums/                 # Shared enums
```

---

## Environment Variables

| Variable               | Required | Description                                             |
| ---------------------- | -------- | ------------------------------------------------------- |
| `PORT`                 | No       | Server port (default: `3000`)                           |
| `DB_URL`               | Yes      | PostgreSQL connection string                            |
| `REDIS_URL`            | Yes      | Redis connection URL                                    |
| `JWT_SECRET`           | Yes      | Secret for signing JWT tokens                           |
| `COOKIE_SECRET`        | Yes      | Secret for signing cookies                              |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth client ID                                  |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth client secret                              |
| `GOOGLE_CALLBACK_URI`  | Yes      | Google OAuth callback URL                               |
| `FRONTEND_URL`         | Yes      | Frontend URL for redirects                              |
| `GEMINI_KEY`           | Yes      | Google Gemini API key                                   |
| `GEMINI_MODEL`         | No       | Gemini model name (default: `gemini-3.5-flash-lite`) |

## Quick Start

### HTTP API versions

The current HTTP API uses URI versioning: `/v1`. Socket.IO remains at
`/socket.io/` because Nest HTTP versioning does not apply to WebSocket events.

| Resource | Current routes |
| --- | --- |
| Health | `GET /v1/health` |
| Accounts and authentication | `POST /v1/auth/accounts`, `POST /v1/auth/sessions`, `GET/DELETE /v1/auth/sessions/current`, `POST /v1/auth/tokens`, `PATCH /v1/auth/accounts/me/role`, `GET /v1/auth/google`, `GET /v1/auth/google/callback` |
| Current user | `GET/PATCH /v1/users/me`, `PUT /v1/users/me/password` |
| Dashboard | `GET /v1/dashboard` (authenticated, per-user summary) |
| Question bundles | `GET/POST /v1/bundles`, `GET/PATCH/DELETE /v1/bundles/:bundleId`, `POST /v1/bundles/:bundleId/questions`, `PATCH/DELETE /v1/bundles/questions/:questionId` |
| Quizzes | `GET/POST /v1/quizzes`, `GET/PATCH/DELETE /v1/quizzes/:quizId`, `POST /v1/quizzes/:quizId/questions`, `PATCH/DELETE /v1/quizzes/questions/:bridgeId` |
| Sessions | `GET /v1/sessions?view=hosted|history`, `POST /v1/sessions`, `GET /v1/sessions/:sessionId`, `GET /v1/sessions/:sessionId/results/me` |
| Quiz generation | `POST /v1/quiz-generations` |

Bundle, quiz, and session list routes accept `page` and `pageSize` (defaults
to 1 and 12; maximum page size 50). They return
`{ items, page, pageSize, total, totalPages }`. Bundle and quiz lists also
support `public=true`; bundles can be filtered with comma-separated `tags`.

The dashboard endpoint returns counts and up to five recent items. Its Redis
entry is scoped by user and role and expires after 60 seconds. If Redis is
unavailable, the endpoint queries PostgreSQL directly.

The old unversioned HTTP paths are compatibility aliases in `src/legacy-routes.ts`.
Keep each alias until its clients migrate; remove aliases individually. For a
future breaking change, add a route with `@Version('2')` while leaving the v1
route in place. A handler that works unchanged in both versions can use
`@Version(['1', '2'])`. This avoids retiring the entire v1 API together.

Set `GOOGLE_CALLBACK_URI` to `/v1/auth/google/callback` for new deployments and
register that URL with Google. The old callback path remains available through
the compatibility alias during migration.

### Replaceable providers

The session module injects `ANSWER_QUEUE`, `ANSWER_SCORER`, and `SESSION_EVENTS`
ports. Their current adapters are BullMQ, `DefaultAnswerScorer`, and
`SessionGateway`. To replace an adapter, register another provider for its token
in `src/sessions/sessions.module.ts`; callers and workers use the port.

Quiz generation uses the `QUIZ_GENERATOR` port in
`src/gemini/quiz-generator.port.ts`. The controller depends on that port.
`QuizGenerationService` validates inputs and outputs and calls the `QUIZ_MODEL`
port. `LangChainGeminiModel` is the current model adapter. To change LLMs,
implement `QuizModel` and change the `QUIZ_MODEL` provider in
`src/gemini/gemini.module.ts`; the route and validation stay the same.
The LangChain adapter uses a prompt template, structured output, and Gemini
safety settings. Generated text is treated as untrusted data and validated
again before it is returned. Semantic accuracy still needs human review.

The answer socket acknowledgement means the answer was accepted by the queue.
Database persistence and scoring happen asynchronously.

### Database access

Services use feature repositories in `src/common/repositories`,
`src/quizzes/repositories`, and `src/sessions/repositories`. Query builders,
selected columns, and multi-table transactions stay in those repositories.
The PostgreSQL indexes for session history, hosted sessions, quiz lists, and
bundle tag overlap are in `sql/query-indexes.sql`. Run that script once against
an existing database outside a transaction; schema synchronization is disabled.

```bash
# Install dependencies
npm install

# Development (hot-reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

---

## Progress Summary

| Area                 | Done       | Pending       | Completion |
| -------------------- | ---------- | ------------- | ---------- |
| Auth & Security      | 13         | 7             | 65%        |
| Quizzes CRUD         | 18         | 1             | 95%        |
| Sessions & Real-time | 9          | 5             | 64%        |
| Gemini AI            | 8          | 0             | 100%       |
| User Module          | 1          | 0             | 100%       |
| Responses Module     | 1 entity   | 1 full module | 10%        |
| Analytics Module     | 2 entities | 1 full module | 10%        |
| Infrastructure       | 7          | 4             | 64%        |
| Code Quality         | —          | 12            | —          |
| **Total**            | **~57**    | **~31**       | **~65%**   |
