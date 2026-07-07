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
| `GEMINI_MODEL`         | No       | Gemini model name (default: `gemini-flash-lite-latest`) |

## Quick Start

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
